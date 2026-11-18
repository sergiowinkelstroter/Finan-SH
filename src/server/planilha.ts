import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringExpenses, settings } from "@/db/schema";
import { addMesesCompetencia, competenciaAtualISO, competenciaLabelCurta } from "@/lib/dates";
import { corCategoria } from "@/lib/categorias";
import { format, lastDayOfMonth, parseISO } from "date-fns";
import { fixaVale } from "./entradas";
import { getFaturasDeMeses } from "./faturas";
import { getProjecao } from "./projecao";

export type GrupoPlanilha = "entradas" | "fixas" | "cartoes" | "variaveis" | "reserva";

export interface LinhaPlanilha {
  id: string;
  grupo: GrupoPlanilha;
  rotulo: string;
  /** Categoria (para ícone/cor) quando fizer sentido. */
  categoria: string | null;
  cor?: string;
  /** Valor por mês (centavos, sempre positivo); índice = coluna. */
  valores: number[];
  estimado?: boolean;
}

export interface Planilha {
  meses: { competencia: string; label: string; ano: string; atual: boolean }[];
  linhas: LinhaPlanilha[];
  saldoInicialCents: number;
}

export async function getPlanilha(qtdMeses = 12): Promise<Planilha> {
  const inicio = competenciaAtualISO();
  const comps = Array.from({ length: qtdMeses }, (_, i) => addMesesCompetencia(inicio, i));

  const [entradas, recorrencias, faturas, projecao, saldoRow] = await Promise.all([
    db.query.incomes.findMany({ where: (i, { eq }) => eq(i.ativo, true), orderBy: (i, { asc }) => [asc(i.descricao)] }),
    db.query.recurringExpenses.findMany({ where: eq(recurringExpenses.ativo, true), orderBy: (r, { asc }) => [asc(r.descricao)] }),
    getFaturasDeMeses(comps),
    getProjecao(qtdMeses),
    db.select().from(settings).where(eq(settings.chave, "saldo_conta_cents")),
  ]);

  const linhas: LinhaPlanilha[] = [];

  for (const e of entradas) {
    const valores = comps.map((c) =>
      e.tipo === "fixa" ? (fixaVale(e, c) ? e.valorCents : 0) : e.competencia === c ? e.valorCents : 0,
    );
    if (valores.some((v) => v > 0)) {
      linhas.push({ id: `in-${e.id}`, grupo: "entradas", rotulo: e.descricao, categoria: null, valores });
    }
  }

  for (const r of recorrencias) {
    const valores = comps.map((c) => {
      const fim = format(lastDayOfMonth(parseISO(c)), "yyyy-MM-dd");
      return r.inicio <= fim && (!r.fim || r.fim >= c) ? r.valorCents : 0;
    });
    if (valores.some((v) => v > 0)) {
      linhas.push({ id: `rec-${r.id}`, grupo: "fixas", rotulo: r.descricao, categoria: r.categoria, valores });
    }
  }

  const porCartao = new Map<number, LinhaPlanilha>();
  comps.forEach((c, i) => {
    for (const f of faturas.get(c) ?? []) {
      let linha = porCartao.get(f.card.id);
      if (!linha) {
        linha = {
          id: `card-${f.card.id}`,
          grupo: "cartoes",
          rotulo: f.card.nome,
          categoria: "Cartão (outros)",
          valores: comps.map(() => 0),
        };
        porCartao.set(f.card.id, linha);
      }
      linha.valores[i] = f.valorCents;
    }
  });
  linhas.push(...[...porCartao.values()].filter((l) => l.valores.some((v) => v > 0)));

  for (const e of projecao.estimativasVariaveis) {
    const valores = comps.map((_, i) =>
      i === 0
        ? e.atualCents + Math.round(e.mediaMensalCents * projecao.proporcaoRestanteMesAtual)
        : e.mediaMensalCents,
    );
    if (valores.some((v) => v > 0)) {
      linhas.push({
        id: `var-${e.chave}`,
        grupo: "variaveis",
        rotulo: e.label,
        categoria: e.categoria,
        cor: corCategoria(e.label),
        valores,
        estimado: true,
      });
    }
  }

  linhas.push({
    id: "reserva",
    grupo: "reserva",
    rotulo: "Guardar na reserva",
    categoria: "Reserva",
    valores: projecao.linhas.map((l) => l.reservaCents),
  });

  const saldo = Number(saldoRow[0]?.valor ?? 0);
  return {
    meses: comps.map((c) => ({
      competencia: c,
      label: competenciaLabelCurta(c),
      ano: c.slice(0, 4),
      atual: c === inicio,
    })),
    linhas,
    saldoInicialCents: Number.isFinite(saldo) ? saldo : 0,
  };
}
