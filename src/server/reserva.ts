import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { savingsEntries } from "@/db/schema";
import { projecaoReserva as calcularProjecaoReserva } from "@/lib/calculos";
import { simularReservaSchema, type SimularReservaInput } from "@/lib/validation";

export async function listarAportes(conta = "principal") {
  return db.query.savingsEntries.findMany({
    where: eq(savingsEntries.conta, conta),
    orderBy: (s, { desc }) => [desc(s.data), desc(s.id)],
  });
}

export async function getReservaAtual(conta = "principal") {
  const [result] = await db
    .select({ total: sql<string>`coalesce(sum(${savingsEntries.valorCents}), 0)` })
    .from(savingsEntries)
    .where(eq(savingsEntries.conta, conta));
  return Number(result.total);
}

export async function simularReserva(input: SimularReservaInput) {
  const data = simularReservaSchema.parse(input);
  const saldoInicialCents = await getReservaAtual();
  const saldos = calcularProjecaoReserva({
    saldoInicialCents,
    aporteMensalCents: data.aporteMensalCents,
    meses: data.meses,
    taxaAA: data.taxaAA ?? 0,
  });
  return { saldoInicialCents, saldos };
}
