import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { incomes } from "@/db/schema";

export async function listarEntradas() {
  return db.query.incomes.findMany({
    orderBy: (i, { desc, asc }) => [desc(i.ativo), asc(i.descricao)],
    with: { user: true },
  });
}

export async function entradasDoMesCents(competencia: string) {
  const [fixasResult] = await db
    .select({ total: sql<string>`coalesce(sum(${incomes.valorCents}), 0)` })
    .from(incomes)
    .where(and(eq(incomes.tipo, "fixa"), eq(incomes.ativo, true)));

  const [extrasResult] = await db
    .select({ total: sql<string>`coalesce(sum(${incomes.valorCents}), 0)` })
    .from(incomes)
    .where(
      and(eq(incomes.tipo, "extra"), eq(incomes.competencia, competencia)),
    );

  return Number(fixasResult.total) + Number(extrasResult.total);
}
