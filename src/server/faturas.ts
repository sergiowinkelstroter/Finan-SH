import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { cards, installments, invoices, purchases } from "@/db/schema";
import { type TipoValor, valorEfetivoCartao } from "@/lib/calculos";

export interface FaturaEfetiva {
  card: typeof cards.$inferSelect;
  invoice: typeof invoices.$inferSelect | null;
  somaParcelasCents: number;
  valorCents: number;
  tipo: TipoValor;
}

async function somaParcelasPorCartao(competencia: string) {
  const rows = await db
    .select({
      cardId: purchases.cardId,
      total: sql<string>`coalesce(sum(${installments.valorCents}), 0)`,
    })
    .from(installments)
    .innerJoin(purchases, eq(installments.purchaseId, purchases.id))
    .where(eq(installments.competencia, competencia))
    .groupBy(purchases.cardId);

  const mapa = new Map<number, number>();
  for (const row of rows) {
    mapa.set(row.cardId, Number(row.total));
  }
  return mapa;
}

export async function getFaturasDoMes(
  competencia: string,
  opts: { soAtivos?: boolean } = { soAtivos: true },
): Promise<FaturaEfetiva[]> {
  const cartoes = await db.query.cards.findMany({
    where: opts.soAtivos ? eq(cards.ativo, true) : undefined,
    orderBy: (c, { asc }) => [asc(c.nome)],
  });

  const invoicesDoMes = await db.query.invoices.findMany({
    where: eq(invoices.competencia, competencia),
  });
  const invoicesPorCartao = new Map(invoicesDoMes.map((i) => [i.cardId, i]));

  const somaParcelas = await somaParcelasPorCartao(competencia);

  return cartoes.map((card) => {
    const invoice = invoicesPorCartao.get(card.id) ?? null;
    const somaParcelasCents = somaParcelas.get(card.id) ?? 0;
    const efetivo = valorEfetivoCartao({
      valorFechadoCents: invoice?.valorFechadoCents ?? null,
      valorParcialCents: invoice?.valorParcialCents ?? 0,
      somaParcelasCents,
    });
    return {
      card,
      invoice,
      somaParcelasCents,
      valorCents: efetivo.valorCents,
      tipo: efetivo.tipo,
    };
  });
}

export async function getFaturasDoCartao(cardId: number) {
  return db.query.invoices.findMany({
    where: eq(invoices.cardId, cardId),
    orderBy: (i, { desc }) => [desc(i.competencia)],
  });
}
