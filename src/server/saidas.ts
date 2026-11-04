import "server-only";

import { and, asc, desc, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { SEM_CATEGORIA } from "@/lib/categorias";
import type { Periodo } from "@/lib/periodo";

export interface FiltroSaidas {
  q?: string;
  categoria?: string;
  pagoPor?: number;
  min?: number; // centavos
  max?: number; // centavos
  ordem?: "data_desc" | "data_asc" | "valor_desc" | "valor_asc";
}

export async function listarSaidas(periodo: Periodo, filtro: FiltroSaidas = {}) {
  const condicoes: SQL[] = [gte(expenses.data, periodo.de), lte(expenses.data, periodo.ate)];
  if (filtro.q) condicoes.push(ilike(expenses.descricao, `%${filtro.q.replace(/[%_]/g, "\\$&")}%`));
  if (filtro.categoria) {
    condicoes.push(
      filtro.categoria === SEM_CATEGORIA
        ? sql`${expenses.categoria} is null`
        : eq(expenses.categoria, filtro.categoria),
    );
  }
  if (filtro.pagoPor) condicoes.push(eq(expenses.pagoPor, filtro.pagoPor));
  if (filtro.min != null) condicoes.push(gte(expenses.valorCents, filtro.min));
  if (filtro.max != null) condicoes.push(lte(expenses.valorCents, filtro.max));

  const ordem =
    filtro.ordem === "data_asc"
      ? [asc(expenses.data), asc(expenses.id)]
      : filtro.ordem === "valor_desc"
        ? [desc(expenses.valorCents)]
        : filtro.ordem === "valor_asc"
          ? [asc(expenses.valorCents)]
          : [desc(expenses.data), desc(expenses.id)];

  return db.query.expenses.findMany({
    where: and(...condicoes),
    orderBy: ordem,
    with: { pagador: true },
  });
}

/** Todas as saídas do período, sem filtros — base das análises. */
export async function saidasNoPeriodo(periodo: Periodo) {
  return db.query.expenses.findMany({
    where: and(gte(expenses.data, periodo.de), lte(expenses.data, periodo.ate)),
    with: { pagador: true },
  });
}

export async function categoriasDeSaidas() {
  const rows = await db.selectDistinct({ categoria: expenses.categoria }).from(expenses);
  return rows.map((r) => r.categoria).filter((c): c is string => !!c);
}
