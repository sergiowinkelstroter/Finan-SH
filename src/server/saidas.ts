import "server-only";

import { and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";

export async function listarSaidas() {
  return db.query.expenses.findMany({
    orderBy: (e, { desc }) => [desc(e.data)],
    with: { pagador: true },
  });
}

export async function saidasDoMesCents(
  primeiroDiaISO: string,
  ultimoDiaISO: string,
) {
  const [result] = await db
    .select({ total: sql<string>`coalesce(sum(${expenses.valorCents}), 0)` })
    .from(expenses)
    .where(and(gte(expenses.data, primeiroDiaISO), lte(expenses.data, ultimoDiaISO)));

  return Number(result.total);
}
