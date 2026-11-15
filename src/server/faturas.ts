import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cards, invoices } from "@/db/schema";
import { type TipoValor, valorEfetivoCartao, vencimentoFatura } from "@/lib/calculos";
import { addMesesCompetencia, competenciaAtualISO, hojeISO } from "@/lib/dates";
import { parcelasNasCompetencias, type ParcelaDetalhada } from "./compras";
import { differenceInCalendarDays, parseISO } from "date-fns";

export interface FaturaEfetiva {
  card: typeof cards.$inferSelect;
  invoice: typeof invoices.$inferSelect | null;
  competencia: string;
  /** Data de vencimento (yyyy-MM-dd) calculada a partir do cadastro do cartão. */
  vencimento: string;
  somaParcelasCents: number;
  valorCents: number;
  tipo: TipoValor;
}

/** Monta as faturas efetivas (cartão × mês) a partir de dados já carregados. */
export function montarFaturas(
  cartoes: (typeof cards.$inferSelect)[],
  invoicesRows: (typeof invoices.$inferSelect)[],
  parcelas: ParcelaDetalhada[],
  competencias: string[],
): Map<string, FaturaEfetiva[]> {
  const invPorChave = new Map(invoicesRows.map((i) => [`${i.cardId}|${i.competencia}`, i]));
  const somaPorChave = new Map<string, number>();
  for (const p of parcelas) {
    const k = `${p.cardId}|${p.competencia}`;
    somaPorChave.set(k, (somaPorChave.get(k) ?? 0) + p.valorCents);
  }

  const resultado = new Map<string, FaturaEfetiva[]>();
  for (const competencia of competencias) {
    resultado.set(
      competencia,
      cartoes.map((card) => {
        const chave = `${card.id}|${competencia}`;
        const invoice = invPorChave.get(chave) ?? null;
        const somaParcelasCents = somaPorChave.get(chave) ?? 0;
        const efetivo = valorEfetivoCartao({
          valorFechadoCents: invoice?.valorFechadoCents ?? null,
          valorParcialCents: invoice?.valorParcialCents ?? 0,
          somaParcelasCents,
        });
        return {
          card,
          invoice,
          competencia,
          vencimento: vencimentoFatura({
            competencia,
            diaFechamento: card.diaFechamento,
            diaVencimento: card.diaVencimento,
          }),
          somaParcelasCents,
          valorCents: efetivo.valorCents,
          tipo: efetivo.tipo,
        };
      }),
    );
  }
  return resultado;
}

export async function getFaturasDeMeses(
  competencias: string[],
  opts: { soAtivos?: boolean } = { soAtivos: true },
) {
  if (competencias.length === 0) return new Map<string, FaturaEfetiva[]>();
  const [cartoes, invoicesRows, parcelas] = await Promise.all([
    db.query.cards.findMany({
      where: opts.soAtivos ? eq(cards.ativo, true) : undefined,
      orderBy: (c, { asc }) => [asc(c.nome)],
    }),
    db.select().from(invoices).where(inArray(invoices.competencia, competencias)),
    parcelasNasCompetencias(competencias),
  ]);
  return montarFaturas(cartoes, invoicesRows, parcelas, competencias);
}

export async function getFaturasDoMes(
  competencia: string,
  opts: { soAtivos?: boolean } = { soAtivos: true },
): Promise<FaturaEfetiva[]> {
  const mapa = await getFaturasDeMeses([competencia], opts);
  return mapa.get(competencia) ?? [];
}

export async function getFaturasDoCartao(cardId: number) {
  return db.query.invoices.findMany({
    where: eq(invoices.cardId, cardId),
    orderBy: (i, { desc }) => [desc(i.competencia)],
  });
}

export interface AlertaVencimento {
  fatura: FaturaEfetiva;
  /** Dias até o vencimento (negativo = atrasada). */
  dias: number;
}

/** Faturas não pagas que venceram há ≤10 dias ou vencem nos próximos 7. */
export async function getAlertasVencimento(): Promise<AlertaVencimento[]> {
  const atual = competenciaAtualISO();
  const comps = [-1, 0, 1].map((o) => addMesesCompetencia(atual, o));
  const mapa = await getFaturasDeMeses(comps, { soAtivos: true });
  const hoje = parseISO(hojeISO());

  const alertas: AlertaVencimento[] = [];
  for (const lista of mapa.values()) {
    for (const f of lista) {
      // O aviso serve para lembrar apenas de faturas ainda abertas.
      // Faturas fechadas já têm valor definitivo e não precisam de alerta.
      if (f.invoice && f.invoice.status !== "aberta") continue;
      if (f.valorCents <= 0) continue;
      const dias = differenceInCalendarDays(parseISO(f.vencimento), hoje);
      if (dias >= -10 && dias <= 7) alertas.push({ fatura: f, dias });
    }
  }
  return alertas.sort((a, b) => a.dias - b.dias);
}
