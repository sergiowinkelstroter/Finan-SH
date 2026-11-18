import "server-only";

import { and, eq, lte, gte, isNull, or } from "drizzle-orm";
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

/** Ocorrências futuras calculadas a partir do cadastro; nunca são gravadas. */
export async function previsoesRecorrencias(de: string, ate: string) {
  const competenciaAtual = competenciaAtualISO();
  if (ate < competenciaAtual) return [];

  const recorrencias = await db.query.recurringExpenses.findMany({
    where: and(
      eq(recurringExpenses.ativo, true),
      lte(recurringExpenses.inicio, ate),
      or(isNull(recurringExpenses.fim), gte(recurringExpenses.fim, de)),
    ),
    with: { pagador: true },
  });
  const existentes = await db.query.expenses.findMany({
    where: and(gte(expenses.data, de), lte(expenses.data, ate)),
    columns: { recorrenciaId: true, data: true },
  });
  const jaLancadas = new Set(existentes.map((e) => `${e.recorrenciaId}|${e.data}`));
  const previsoes = [];

  for (const r of recorrencias) {
    let mes = startOfMonth(parseISO(de < competenciaAtual ? competenciaAtual : de));
    while (format(mes, "yyyy-MM-dd") <= ate) {
      // Mês já materializado em `expenses`: o lançamento real (ou a exclusão dele)
      // vale — não cria previsão por cima, mesmo se o dia da recorrência mudou.
      if (r.ultimaGeracao && format(mes, "yyyy-MM-dd") <= r.ultimaGeracao) {
        mes = addMonths(mes, 1);
        continue;
      }
      const dia = Math.min(r.diaMes, getDaysInMonth(mes));
      const data = format(new Date(mes.getFullYear(), mes.getMonth(), dia), "yyyy-MM-dd");
      if (data >= de && data >= r.inicio && (!r.fim || data <= r.fim) && !jaLancadas.has(`${r.id}|${data}`)) {
        const chaveMes = Number(format(mes, "yyyyMM"));
        previsoes.push({
          id: -(r.id * 100_000_000 + chaveMes),
          descricao: r.descricao,
          valorCents: r.valorCents,
          data,
          categoria: r.categoria,
          pagoPor: r.pagoPor,
          compartilhada: r.compartilhada,
          recorrenciaId: r.id,
          pagador: r.pagador,
          virtual: true as const,
        });
      }
      mes = addMonths(mes, 1);
    }
  }
  return previsoes;
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
