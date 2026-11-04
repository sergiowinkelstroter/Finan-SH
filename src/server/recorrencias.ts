import "server-only";

import { eq } from "drizzle-orm";
import { addMonths, format, getDaysInMonth, lastDayOfMonth, parseISO, startOfMonth } from "date-fns";
import { db } from "@/db";
import { expenses, recurringExpenses } from "@/db/schema";
import { competenciaAtualISO } from "@/lib/dates";

export async function listarRecorrencias() {
  return db.query.recurringExpenses.findMany({
    orderBy: (r, { desc, asc }) => [desc(r.ativo), asc(r.descricao)],
    with: { pagador: true },
  });
}

/** Soma mensal (centavos) das recorrências vigentes em cada competência — usada na projeção. */
export async function recorrenciasPorMes(competencias: string[]) {
  const todas = await db.query.recurringExpenses.findMany({
    where: eq(recurringExpenses.ativo, true),
  });
  return new Map(
    competencias.map((c) => [
      c,
      todas
        .filter((r) => r.inicio <= endOfCompetencia(c) && (!r.fim || r.fim >= c))
        .reduce((s, r) => s + r.valorCents, 0),
    ]),
  );
}

function endOfCompetencia(c: string) {
  return format(lastDayOfMonth(parseISO(c)), "yyyy-MM-dd");
}

/**
 * Lança em `expenses` as recorrências ativas cujos meses ainda não foram
 * materializados (até o mês atual). Idempotente: o unique (recorrencia_id,
 * data) + `ultima_geracao` impedem duplicidade e reaparecimento de itens
 * que o usuário apagou.
 */
export async function garantirRecorrencias() {
  const atual = competenciaAtualISO();
  const pendentes = await db.query.recurringExpenses.findMany({
    where: eq(recurringExpenses.ativo, true),
  });

  for (const r of pendentes) {
    if (r.ultimaGeracao && r.ultimaGeracao >= atual) continue;
    let mes = r.ultimaGeracao
      ? addMonths(parseISO(r.ultimaGeracao), 1)
      : startOfMonth(parseISO(r.inicio));
    const fimMes = r.fim ? parseISO(r.fim) : null;
    const linhas: (typeof expenses.$inferInsert)[] = [];
    let ultima: string | null = null;

    while (format(mes, "yyyy-MM-dd") <= atual) {
      const dia = Math.min(r.diaMes, getDaysInMonth(mes));
      const data = format(new Date(mes.getFullYear(), mes.getMonth(), dia), "yyyy-MM-dd");
      if (data >= r.inicio && (!fimMes || data <= format(fimMes, "yyyy-MM-dd"))) {
        linhas.push({
          descricao: r.descricao,
          valorCents: r.valorCents,
          data,
          categoria: r.categoria,
          pagoPor: r.pagoPor,
          compartilhada: r.compartilhada,
          recorrenciaId: r.id,
        });
      }
      ultima = format(mes, "yyyy-MM-dd");
      mes = addMonths(mes, 1);
    }

    if (linhas.length > 0) {
      await db.insert(expenses).values(linhas).onConflictDoNothing();
    }
    if (ultima) {
      await db
        .update(recurringExpenses)
        .set({ ultimaGeracao: ultima })
        .where(eq(recurringExpenses.id, r.id));
    }
  }
}
