"use server";

import { createHash } from "node:crypto";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categoryRules, expenses, installments, purchases, recurringExpenses } from "@/db/schema";
import {
  chaveEstabelecimento,
  descricoesParecidas,
  normalizarDescricao,
  sugerirCategoria,
  type FonteCategoria,
} from "@/lib/categorizacao";
import { normalizarCategoria } from "@/lib/categorias";
import { addMesesCompetencia } from "@/lib/dates";
import { addDays, format, parseISO } from "date-fns";
import { contextoCategorizacao } from "./importacao";

const dataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const parcelaSchema = z.object({ n: z.number().int().min(1), total: z.number().int().min(2).max(48) });

const destinoSchema = z.discriminatedUnion("destino", [
  z.object({ destino: z.literal("cartao"), cardId: z.number().int().positive(), competencia: dataISO }),
  z.object({ destino: z.literal("conta") }),
]);

const analisarSchema = z.object({
  alvo: destinoSchema,
  linhas: z
    .array(
      z.object({
        idx: z.number().int(),
        data: dataISO,
        descricao: z.string().min(1).max(300),
        valorCents: z.number().int().positive(),
        fitid: z.string().max(200).optional(),
        parcela: parcelaSchema.optional(),
      }),
    )
    .max(2000),
});
export type AnalisarInput = z.infer<typeof analisarSchema>;

export type StatusLinha =
  | "novo"
  | "ja-importado"
  | "parcela-cadastrada"
  | "parcela-nova"
  | "conta-fixa"
  | "possivel-duplicata"
  | "transferencia";

/** Saídas da conta que não são gasto: pagar a fatura (já contada no cartão) ou mover para investimento. */
const TRANSFERENCIA =
  /PAGAMENTO\s+(DE\s+)?FATURA|PAG(TO)?\s+FATURA|FATURA\s+(DO\s+)?CART|PAGAMENTO\s+CART|APLICACAO|RESGATE|POUPANCA|CDB|TESOURO|INVEST|TRANSF(ERENCIA)?\s+ENTRE\s+CONTAS|MESMA\s+TITULARIDADE/;

export interface LinhaAnalisada {
  idx: number;
  origemId: string;
  sugestao: string | null;
  fonte: FonteCategoria | null;
  status: StatusLinha;
  detalhe?: string;
}

function origemIdDe(alvo: AnalisarInput["alvo"], chave: string, ocorrencia: number) {
  const base = `${alvo.destino}|${alvo.destino === "cartao" ? alvo.cardId : 0}|${chave}|${ocorrencia}`;
  return createHash("sha1").update(base).digest("hex");
}

const perto = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

/**
 * Prepara a revisão: sugere categoria e marca o que provavelmente já existe
 * (reimportação, parcela já cadastrada, conta fixa, lançamento manual igual).
 */
export async function analisarImportacao(input: AnalisarInput): Promise<LinhaAnalisada[]> {
  const { alvo, linhas } = analisarSchema.parse(input);
  const ctx = await contextoCategorizacao();

  const ocorrencias = new Map<string, number>();
  const comOrigem = linhas.map((l) => {
    // "3/10" e "4/10" da mesma compra podem vir com a mesma data e valor: a parcela diferencia.
    const chave =
      l.fitid ??
      `${l.data}|${normalizarDescricao(l.descricao)}|${l.valorCents}${l.parcela ? `|p${l.parcela.n}/${l.parcela.total}` : ""}`;
    const n = (ocorrencias.get(chave) ?? 0) + 1;
    ocorrencias.set(chave, n);
    return { ...l, origemId: origemIdDe(alvo, chave, n) };
  });

  const ids = comOrigem.map((l) => l.origemId);
  const tabela = alvo.destino === "cartao" ? purchases : expenses;
  const jaImportados = new Set(
    ids.length
      ? (await db.select({ o: tabela.origemId }).from(tabela).where(inArray(tabela.origemId, ids))).map((r) => r.o)
      : [],
  );

  const recorrencias = await db.query.recurringExpenses.findMany({ where: eq(recurringExpenses.ativo, true) });

  // Candidatos a duplicata já gravados (cada um só "casa" com uma linha).
  type Existente = { id: string; valor: number; descricao: string; numero?: number; qtd?: number; data?: string };
  let existentes: Existente[] = [];
  if (alvo.destino === "cartao") {
    const rows = await db
      .select({
        id: installments.id,
        numero: installments.numero,
        valor: installments.valorCents,
        descricao: purchases.descricao,
        qtd: purchases.qtdParcelas,
      })
      .from(installments)
      .innerJoin(purchases, eq(installments.purchaseId, purchases.id))
      .where(and(eq(purchases.cardId, alvo.cardId), eq(installments.competencia, alvo.competencia)));
    existentes = rows.map((r) => ({ ...r, id: `i${r.id}`, valor: Number(r.valor) }));
  } else if (linhas.length) {
    const datas = linhas.map((l) => l.data).sort();
    const de = format(addDays(parseISO(datas[0]), -3), "yyyy-MM-dd");
    const ate = format(addDays(parseISO(datas[datas.length - 1]), 3), "yyyy-MM-dd");
    const rows = await db
      .select({ id: expenses.id, valor: expenses.valorCents, descricao: expenses.descricao, data: expenses.data, origemId: expenses.origemId })
      .from(expenses)
      .where(and(gte(expenses.data, de), lte(expenses.data, ate), isNull(expenses.origemId)));
    existentes = rows.map((r) => ({ id: `e${r.id}`, valor: Number(r.valor), descricao: r.descricao, data: r.data }));
  }
  const usados = new Set<string>();
  const pegar = (pred: (e: Existente) => boolean) => {
    const e = existentes.find((x) => !usados.has(x.id) && pred(x));
    if (e) usados.add(e.id);
    return e;
  };

  return comOrigem.map<LinhaAnalisada>((l) => {
    const sug = sugerirCategoria(l.descricao, ctx);
    const base = { idx: l.idx, origemId: l.origemId, sugestao: sug?.categoria ?? null, fonte: sug?.fonte ?? null };

    if (jaImportados.has(l.origemId)) return { ...base, status: "ja-importado", detalhe: "Importado antes" };

    if (alvo.destino === "cartao") {
      if (l.parcela) {
        const p = l.parcela;
        const achou =
          pegar((e) => e.numero === p.n && e.qtd === p.total && perto(e.valor, l.valorCents)) ??
          pegar((e) => e.numero === p.n && perto(e.valor, l.valorCents) && descricoesParecidas(e.descricao, l.descricao));
        if (achou) return { ...base, status: "parcela-cadastrada", detalhe: `Já em Parcelas: ${achou.descricao}` };
        return {
          ...base,
          status: "parcela-nova",
          detalhe: `Cria compra em ${p.total}x (esta é a ${p.n}ª)`,
        };
      }
      const manual = pegar((e) => e.qtd === 1 && perto(e.valor, l.valorCents, 1) && descricoesParecidas(e.descricao, l.descricao));
      if (manual) return { ...base, status: "possivel-duplicata", detalhe: `Parecida com "${manual.descricao}"` };
    } else {
      if (TRANSFERENCIA.test(normalizarDescricao(l.descricao))) {
        return { ...base, status: "transferencia", detalhe: "Pagamento de fatura ou investimento — não é gasto" };
      }
      const manual = pegar(
        (e) =>
          perto(e.valor, l.valorCents, 1) &&
          (descricoesParecidas(e.descricao, l.descricao) || e.data === l.data),
      );
      if (manual) return { ...base, status: "possivel-duplicata", detalhe: `Já lançada: "${manual.descricao}"` };
    }

    const fixa = recorrencias.find(
      (r) => perto(r.valorCents, l.valorCents, 100) && descricoesParecidas(r.descricao, l.descricao),
    );
    if (fixa) return { ...base, status: "conta-fixa", detalhe: `É a conta fixa "${fixa.descricao}"` };

    return { ...base, status: "novo" };
  });
}

const importarSchema = z.object({
  alvo: destinoSchema,
  pessoaId: z.number().int().positive().nullable().optional(),
  compartilhada: z.boolean().default(true),
  itens: z
    .array(
      z.object({
        origemId: z.string().length(40),
        data: dataISO,
        descricao: z.string().trim().min(1).max(300),
        valorCents: z.number().int().positive(),
        categoria: z.string().trim().max(60).nullable(),
        parcela: parcelaSchema.nullable().optional(),
        lembrarRegra: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(2000),
});
export type ImportarInput = z.input<typeof importarSchema>;

type Lote = Parameters<typeof db.batch>[0];

/** Remove "Parcela 3/10" da descrição de compras parceladas importadas. */
function semParcela(descricao: string) {
  return (
    descricao
      .replace(/\s*[-–]?\s*parc(?:ela)?\.?\s*\d{1,2}\s*(?:\/|de)\s*\d{1,2}\s*/i, " ")
      .replace(/\s+\d{1,2}\s*\/\s*\d{1,2}\s*$/, "")
      .trim() || descricao
  );
}

export async function importarLancamentos(input: ImportarInput) {
  const data = importarSchema.parse(input);
  const { alvo } = data;
  const tabela = alvo.destino === "cartao" ? purchases : expenses;

  const existentes = new Set(
    (
      await db
        .select({ o: tabela.origemId })
        .from(tabela)
        .where(inArray(tabela.origemId, data.itens.map((i) => i.origemId)))
    ).map((r) => r.o),
  );
  const itens = data.itens.filter((i) => !existentes.has(i.origemId));

  if (alvo.destino === "cartao" && itens.length) {
    const idsRes = await db.execute<{ id: string }>(
      sql`select nextval(pg_get_serial_sequence('purchases', 'id')) as id from generate_series(1, ${itens.length})`,
    );
    const ids = idsRes.rows.map((r) => Number(r.id));
    // Cada compra + suas parcelas fica no mesmo lote (atômico no Neon).
    const grupos = itens.map((it, k) => {
      const id = ids[k];
      const qtd = it.parcela?.total ?? 1;
      const primeira = it.parcela ? addMesesCompetencia(alvo.competencia, -(it.parcela.n - 1)) : alvo.competencia;
      return [
        db.insert(purchases).values({
          id,
          cardId: alvo.cardId,
          descricao: it.parcela ? semParcela(it.descricao) : it.descricao,
          valorTotalCents: it.valorCents * qtd,
          qtdParcelas: qtd,
          primeiraCompetencia: primeira,
          compradorId: data.pessoaId ?? null,
          categoria: normalizarCategoria(it.categoria),
          compartilhada: data.compartilhada,
          origemId: it.origemId,
        }),
        db.insert(installments).values(
          Array.from({ length: qtd }, (_, i) => ({
            purchaseId: id,
            numero: i + 1,
            competencia: addMesesCompetencia(primeira, i),
            valorCents: it.valorCents,
          })),
        ),
      ];
    });
    for (let i = 0; i < grupos.length; i += 100) {
      await db.batch(grupos.slice(i, i + 100).flat() as unknown as Lote);
    }
  }

  if (alvo.destino === "conta" && itens.length) {
    for (let i = 0; i < itens.length; i += 500) {
      await db
        .insert(expenses)
        .values(
          itens.slice(i, i + 500).map((it) => ({
            descricao: it.descricao,
            valorCents: it.valorCents,
            data: it.data,
            categoria: normalizarCategoria(it.categoria),
            pagoPor: data.pessoaId ?? null,
            compartilhada: data.compartilhada,
            origemId: it.origemId,
          })),
        )
        .onConflictDoNothing();
    }
  }

  const regras = new Map<string, string>();
  for (const it of itens) {
    const cat = normalizarCategoria(it.categoria);
    const padrao = chaveEstabelecimento(it.descricao);
    if (it.lembrarRegra && cat && padrao) regras.set(padrao, cat);
  }
  if (regras.size) {
    await Promise.all(
      [...regras].map(([padrao, categoria]) =>
        db
          .insert(categoryRules)
          .values({ padrao, categoria })
          .onConflictDoUpdate({ target: categoryRules.padrao, set: { categoria } }),
      ),
    );
  }

  revalidarTudo();
  return { importados: itens.length, ignorados: data.itens.length - itens.length, regras: regras.size };
}

const regraSchema = z.object({
  padrao: z.string().trim().min(2).max(80),
  categoria: z.string().trim().min(1).max(60),
});

export async function salvarRegra(input: z.input<typeof regraSchema>) {
  const r = regraSchema.parse(input);
  const padrao = normalizarDescricao(r.padrao);
  const categoria = normalizarCategoria(r.categoria)!;
  await db
    .insert(categoryRules)
    .values({ padrao, categoria })
    .onConflictDoUpdate({ target: categoryRules.padrao, set: { categoria } });
  revalidatePath("/importar");
}

export async function excluirRegra(id: number) {
  await db.delete(categoryRules).where(eq(categoryRules.id, z.number().int().parse(id)));
  revalidatePath("/importar");
}

/** Passa as regras/histórico/dicionário em tudo que está sem categoria. */
export async function categorizarPendentes() {
  const ctx = await contextoCategorizacao();
  const [compras, saidas] = await Promise.all([
    db.select({ id: purchases.id, descricao: purchases.descricao }).from(purchases).where(isNull(purchases.categoria)),
    db.select({ id: expenses.id, descricao: expenses.descricao }).from(expenses).where(isNull(expenses.categoria)),
  ]);
  const updates = [
    ...compras.flatMap((c) => {
      const s = sugerirCategoria(c.descricao, ctx);
      return s ? [db.update(purchases).set({ categoria: s.categoria }).where(eq(purchases.id, c.id))] : [];
    }),
    ...saidas.flatMap((c) => {
      const s = sugerirCategoria(c.descricao, ctx);
      return s ? [db.update(expenses).set({ categoria: s.categoria }).where(eq(expenses.id, c.id))] : [];
    }),
  ];
  for (let i = 0; i < updates.length; i += 200) {
    await db.batch(updates.slice(i, i + 200) as unknown as Lote);
  }
  revalidarTudo();
  return { categorizados: updates.length, semCategoria: compras.length + saidas.length - updates.length };
}

function revalidarTudo() {
  for (const p of ["/", "/saidas", "/parcelas", "/faturas", "/analises", "/fluxo", "/projecao", "/planilha", "/importar"]) {
    revalidatePath(p);
  }
}
