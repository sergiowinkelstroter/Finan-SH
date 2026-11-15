import "server-only";

import { and, asc, desc, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { SEM_CATEGORIA } from "@/lib/categorias";
import type { Periodo } from "@/lib/periodo";
import { previsoesRecorrencias } from "./recorrencias";

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

  const efetivas = await db.query.expenses.findMany({
    where: and(...condicoes),
    orderBy: ordem,
    with: { pagador: true },
  });
  const previsoes = await previsoesRecorrencias(periodo.de, periodo.ate);
  const busca = filtro.q?.trim().toLocaleLowerCase("pt-BR");
  return [...efetivas, ...previsoes]
    .filter((s) => !busca || s.descricao.toLocaleLowerCase("pt-BR").includes(busca))
    .filter((s) => !filtro.categoria || (s.categoria ?? "") === (filtro.categoria === SEM_CATEGORIA ? "" : filtro.categoria))
    .filter((s) => !filtro.pagoPor || s.pagoPor === filtro.pagoPor)
    .filter((s) => filtro.min == null || s.valorCents >= filtro.min)
    .filter((s) => filtro.max == null || s.valorCents <= filtro.max)
    .sort((a, b) => {
      if (filtro.ordem === "data_asc") return a.data.localeCompare(b.data) || a.id - b.id;
      if (filtro.ordem === "valor_desc") return b.valorCents - a.valorCents;
      if (filtro.ordem === "valor_asc") return a.valorCents - b.valorCents;
      return b.data.localeCompare(a.data) || b.id - a.id;
    });
}

/** Todas as saídas do período, sem filtros — base das análises. */
export async function saidasNoPeriodo(periodo: Periodo) {
  const efetivas = await db.query.expenses.findMany({
    where: and(gte(expenses.data, periodo.de), lte(expenses.data, periodo.ate)),
    with: { pagador: true },
  });
  const previsoes = await previsoesRecorrencias(periodo.de, periodo.ate);
  return [...efetivas, ...previsoes];
}

export async function categoriasDeSaidas() {
  const rows = await db.selectDistinct({ categoria: expenses.categoria }).from(expenses);
  return rows.map((r) => r.categoria).filter((c): c is string => !!c);
}
