import "server-only";

import { eq } from "drizzle-orm";
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
