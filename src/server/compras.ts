import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { installments } from "@/db/schema";

export async function listarCompras() {
  return db.query.purchases.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    with: { card: true, comprador: true, installments: true },
  });
}

/** Mapa competência → soma de parcelas comprometidas naquele mês (passado e futuro). */
export async function getComprometidoPorMes() {
  const rows = await db
    .select({
      competencia: installments.competencia,
      total: sql<string>`coalesce(sum(${installments.valorCents}), 0)`,
    })
    .from(installments)
    .groupBy(installments.competencia)
    .orderBy(installments.competencia);

  const mapa = new Map<string, number>();
  for (const row of rows) {
    mapa.set(row.competencia, Number(row.total));
  }
  return mapa;
}
