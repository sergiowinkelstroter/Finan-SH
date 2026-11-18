import "server-only";

import { desc, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { categoryRules, expenses, purchases } from "@/db/schema";
import { montarHistorico, type ContextoCategorizacao } from "@/lib/categorizacao";

export async function listarRegras() {
  return db.query.categoryRules.findMany({ orderBy: (r, { asc }) => [asc(r.padrao)] });
}

/** Regras do casal + histórico de lançamentos já categorizados. */
export async function contextoCategorizacao(): Promise<ContextoCategorizacao> {
  const [regras, compras, saidas] = await Promise.all([
    db.select({ padrao: categoryRules.padrao, categoria: categoryRules.categoria }).from(categoryRules),
    db
      .select({ descricao: purchases.descricao, categoria: purchases.categoria })
      .from(purchases)
      .where(isNotNull(purchases.categoria))
      .orderBy(desc(purchases.id))
      .limit(3000),
    db
      .select({ descricao: expenses.descricao, categoria: expenses.categoria })
      .from(expenses)
      .where(isNotNull(expenses.categoria))
      .orderBy(desc(expenses.id))
      .limit(3000),
  ]);
  return { regras, historico: montarHistorico([...compras, ...saidas]) };
}
