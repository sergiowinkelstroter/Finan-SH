import "server-only";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { budgets, settings } from "@/db/schema";

export async function getTetoPadraoCents() {
  const row = await db.query.settings.findFirst({
    where: eq(settings.chave, "teto_padrao_cents"),
  });
  return row ? Number(row.valor) : 0;
}

export async function getTetoDoMes(competencia: string) {
  const row = await db.query.budgets.findFirst({
    where: eq(budgets.competencia, competencia),
  });
  if (row) return row.tetoCents;
  return getTetoPadraoCents();
}

export async function listarTetos() {
  return db.query.budgets.findMany({
    orderBy: (b, { desc }) => [desc(b.competencia)],
  });
}

/** Teto de cada competência (o do mês, ou o padrão quando não definido). */
export async function tetosPorMes(competencias: string[]) {
  const [rows, padrao] = await Promise.all([
    competencias.length
      ? db.select().from(budgets).where(inArray(budgets.competencia, competencias))
      : Promise.resolve([]),
    getTetoPadraoCents(),
  ]);
  const definidos = new Map(rows.map((r) => [r.competencia, r.tetoCents]));
  return new Map(competencias.map((c) => [c, definidos.get(c) ?? padrao]));
}
