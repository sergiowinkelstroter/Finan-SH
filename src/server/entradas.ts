import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { incomes } from "@/db/schema";
import type { Periodo } from "@/lib/periodo";
import { lastDayOfMonth, parseISO, format } from "date-fns";

type Entrada = typeof incomes.$inferSelect;

export async function listarEntradas() {
  return db.query.incomes.findMany({
    orderBy: (i, { desc, asc }) => [asc(i.tipo), asc(i.descricao), desc(i.id)],
    with: { user: true },
  });
}

/** Uma entrada fixa vale no mês `competencia` (dia 1) se a vigência o cobre. */
export function fixaVale(e: Pick<Entrada, "vigenciaInicio" | "vigenciaFim">, competencia: string) {
  const ultimoDia = format(lastDayOfMonth(parseISO(competencia)), "yyyy-MM-dd");
  if (e.vigenciaInicio && e.vigenciaInicio > ultimoDia) return false;
  if (e.vigenciaFim && e.vigenciaFim < competencia) return false;
  return true;
}

export function somarEntradasPorMes(todas: Entrada[], competencias: string[]) {
  const mapa = new Map<string, number>();
  for (const c of competencias) {
    let total = 0;
    for (const e of todas) {
      if (!e.ativo) continue;
      if (e.tipo === "fixa") {
        if (fixaVale(e, c)) total += e.valorCents;
      } else if (e.competencia === c) {
        total += e.valorCents;
      }
    }
    mapa.set(c, total);
  }
  return mapa;
}

export async function entradasPorMes(competencias: string[]) {
  const todas = await db.query.incomes.findMany();
  return somarEntradasPorMes(todas, competencias);
}

export async function entradasDoMesCents(competencia: string) {
  const mapa = await entradasPorMes([competencia]);
  return mapa.get(competencia) ?? 0;
}

/** Entradas que contam no período: fixas vigentes em algum mês e extras das competências. */
export async function listarEntradasDoPeriodo(periodo: Periodo) {
  const todas = await db.query.incomes.findMany({
    with: { user: true },
    orderBy: (i, { asc }) => [asc(i.descricao)],
  });
  const fixas = todas.filter(
    (e) => e.tipo === "fixa" && periodo.competencias.some((c) => fixaVale(e, c)),
  );
  const extras = todas
    .filter((e) => e.tipo === "extra" && e.competencia && periodo.competencias.includes(e.competencia))
    .sort((a, b) => (b.competencia ?? "").localeCompare(a.competencia ?? ""));
  const porMes = somarEntradasPorMes(todas, periodo.competencias);
  const total = [...porMes.values()].reduce((a, b) => a + b, 0);
  return { fixas, extras, porMes, totalCents: total };
}

export async function entradasPorIds(ids: number[]) {
  if (ids.length === 0) return [];
  return db.select().from(incomes).where(inArray(incomes.id, ids));
}

export async function getEntrada(id: number) {
  return db.query.incomes.findFirst({ where: eq(incomes.id, id) });
}
