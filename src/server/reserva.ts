import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { savingsEntries, settings } from "@/db/schema";
import { calcularProgressoMeta, projecaoReserva as calcularProjecaoReserva } from "@/lib/calculos";
import { addMesesCompetencia, competenciaAtualISO } from "@/lib/dates";
import type { Periodo } from "@/lib/periodo";
import { competenciaLabelCurta } from "@/lib/dates";
import { differenceInCalendarMonths, parseISO } from "date-fns";
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

/** Todas as movimentações do período, inclusive o saldo inicial (tela da reserva). */
export async function listarMovimentosDoPeriodo(periodo: Periodo, conta = "principal") {
  return db.query.savingsEntries.findMany({
    where: and(
      eq(savingsEntries.conta, conta),
      gte(savingsEntries.data, periodo.de),
      lte(savingsEntries.data, periodo.ate),
    ),
    orderBy: (s, { desc }) => [desc(s.data), desc(s.id)],
  });
}

/** Aportes/resgates do período que contam como saída do mês (sem o saldo inicial). */
export async function listarAportesDoPeriodo(periodo: Periodo, conta = "principal") {
  return db.query.savingsEntries.findMany({
    where: and(
      eq(savingsEntries.conta, conta),
      eq(savingsEntries.inicial, false),
      gte(savingsEntries.data, periodo.de),
      lte(savingsEntries.data, periodo.ate),
    ),
    orderBy: (s, { desc }) => [desc(s.data), desc(s.id)],
  });
}

/** Saldo acumulado ao fim de cada competência do período + aportes líquidos do mês. */
export async function getEvolucaoReserva(periodo: Periodo, conta = "principal") {
  const todos = await db.query.savingsEntries.findMany({
    where: eq(savingsEntries.conta, conta),
  });
  return periodo.competencias.map((c) => {
    const proximo = new Date(Number(c.slice(0, 4)), Number(c.slice(5, 7)), 1);
    const fim = `${proximo.getFullYear()}-${String(proximo.getMonth() + 1).padStart(2, "0")}-01`;
    const ate = todos.filter((e) => e.data < fim);
    const doMes = todos.filter((e) => e.data >= c && e.data < fim);
    return {
      competencia: c,
      label: competenciaLabelCurta(c),
      saldoCents: ate.reduce((s, e) => s + e.valorCents, 0),
      aportesCents: doMes.filter((e) => !e.inicial).reduce((s, e) => s + e.valorCents, 0),
    };
  });
}

/** Quanto o casal planeja guardar por mês (usado na projeção e na planilha). */
export async function getAportePlanejado() {
  const [row] = await db.select().from(settings).where(eq(settings.chave, "aporte_planejado_cents"));
  const v = Number(row?.valor ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

/** Aporte líquido de um mês (competência yyyy-MM-01). */
export async function getAporteDoMes(competencia: string, conta = "principal") {
  const fim = addMesesCompetencia(competencia, 1);
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(${savingsEntries.valorCents}), 0)` })
    .from(savingsEntries)
    .where(
      and(
        eq(savingsEntries.conta, conta),
        eq(savingsEntries.inicial, false),
        gte(savingsEntries.data, competencia),
        sql`${savingsEntries.data} < ${fim}`,
      ),
    );
  return Number(r.total);
}

export async function getSaldoInicial(conta = "principal") {
  return db.query.savingsEntries.findFirst({
    where: and(eq(savingsEntries.conta, conta), eq(savingsEntries.inicial, true)),
    orderBy: (s, { asc }) => [asc(s.data)],
  });
}

export async function getMetaReserva() {
  const rows = await db.select().from(settings);
  const valor = (k: string) => rows.find((r) => r.chave === k)?.valor;
  const metaCents = Number(valor("meta_reserva_cents") ?? 0);
  const prazo = valor("meta_reserva_prazo") || null; // yyyy-MM
  return { metaCents: Number.isFinite(metaCents) ? metaCents : 0, prazo };
}

/** Ritmo médio de aporte líquido por mês nos últimos 6 meses (incluindo o atual). */
async function aporteMedioMensal(conta = "principal") {
  const inicio = addMesesCompetencia(competenciaAtualISO(), -5);
  const [r] = await db
    .select({ total: sql<string>`coalesce(sum(${savingsEntries.valorCents}), 0)` })
    .from(savingsEntries)
    .where(and(eq(savingsEntries.conta, conta), eq(savingsEntries.inicial, false), gte(savingsEntries.data, inicio)));
  return Math.round(Number(r.total) / 6);
}

export async function getProgressoMeta(saldoCents: number) {
  const [{ metaCents, prazo }, aporteMedioMensalCents] = await Promise.all([
    getMetaReserva(),
    aporteMedioMensal(),
  ]);
  if (metaCents <= 0) return null;
  const mesesAtePrazo = prazo
    ? differenceInCalendarMonths(parseISO(`${prazo}-01`), parseISO(competenciaAtualISO())) + 1
    : null;
  return {
    metaCents,
    prazo,
    aporteMedioMensalCents,
    mesesAtePrazo,
    ...calcularProgressoMeta({ saldoCents, metaCents, aporteMedioMensalCents, mesesAtePrazo }),
  };
}
