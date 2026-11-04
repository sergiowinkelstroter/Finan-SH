import "server-only";

import { gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { installments, purchases } from "@/db/schema";
import { competenciaAtualISO } from "@/lib/dates";
import type { Periodo } from "@/lib/periodo";

export interface ParcelaDetalhada {
  purchaseId: number;
  numero: number;
  competencia: string;
  valorCents: number;
  cardId: number;
  categoria: string | null;
  compartilhada: boolean;
  compradorId: number | null;
}

export async function parcelasNasCompetencias(
  competencias: string[],
): Promise<ParcelaDetalhada[]> {
  if (competencias.length === 0) return [];
  const rows = await db
    .select({
      purchaseId: installments.purchaseId,
      numero: installments.numero,
      competencia: installments.competencia,
      valorCents: installments.valorCents,
      cardId: purchases.cardId,
      categoria: purchases.categoria,
      compartilhada: purchases.compartilhada,
      compradorId: purchases.compradorId,
    })
    .from(installments)
    .innerJoin(purchases, sql`${installments.purchaseId} = ${purchases.id}`)
    .where(inArray(installments.competencia, competencias));
  return rows.map((r) => ({ ...r, valorCents: Number(r.valorCents) }));
}

export interface FiltroCompras {
  q?: string;
  cardId?: number;
  compradorId?: number;
  categoria?: string;
  status?: "ativas" | "quitadas" | "todas";
}

export async function listarCompras(periodo: Periodo, filtro: FiltroCompras = {}) {
  const rows = await db.query.purchases.findMany({
    orderBy: (p, { desc }) => [desc(p.createdAt)],
    with: { card: true, comprador: true, installments: true },
  });
  const atual = competenciaAtualISO();
  const q = filtro.q?.trim().toLowerCase();

  const compras = rows
    .map((c) => {
      const parcelas = [...c.installments].sort((a, b) => a.numero - b.numero);
      const noPeriodo = parcelas.filter((p) => periodo.competencias.includes(p.competencia));
      const pendentes = parcelas.filter((p) => p.competencia >= atual);
      const feitas = parcelas.filter((p) => p.competencia < atual).length;
      return {
        ...c,
        installments: parcelas,
        noPeriodoCents: noPeriodo.reduce((s, p) => s + p.valorCents, 0),
        temParcelaNoPeriodo: noPeriodo.length > 0,
        parcelaNoPeriodo: noPeriodo[0]?.numero ?? null,
        restanteCents: pendentes.reduce((s, p) => s + p.valorCents, 0),
        parcelasPagas: feitas,
        quitada: pendentes.length === 0,
        ultimaCompetencia: parcelas[parcelas.length - 1]?.competencia ?? c.primeiraCompetencia,
      };
    })
    .filter((c) => c.temParcelaNoPeriodo)
    .filter((c) => !filtro.cardId || c.cardId === filtro.cardId)
    .filter((c) => !filtro.compradorId || c.compradorId === filtro.compradorId)
    .filter((c) => !filtro.categoria || (c.categoria ?? "") === filtro.categoria)
    .filter((c) => !q || c.descricao.toLowerCase().includes(q))
    .filter((c) =>
      filtro.status === "ativas" ? !c.quitada : filtro.status === "quitadas" ? c.quitada : true,
    );

  return compras;
}

export async function categoriasDeCompras() {
  const rows = await db
    .selectDistinct({ categoria: purchases.categoria })
    .from(purchases);
  return rows.map((r) => r.categoria).filter((c): c is string => !!c);
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

/** Quanto do limite de cada cartão já está comprometido (parcelas do mês atual em diante). */
export async function getLimiteComprometidoPorCartao() {
  const rows = await db
    .select({
      cardId: purchases.cardId,
      total: sql<string>`coalesce(sum(${installments.valorCents}), 0)`,
    })
    .from(installments)
    .innerJoin(purchases, sql`${installments.purchaseId} = ${purchases.id}`)
    .where(gte(installments.competencia, competenciaAtualISO()))
    .groupBy(purchases.cardId);
  return new Map(rows.map((r) => [r.cardId, Number(r.total)]));
}
