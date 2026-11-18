import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cards, installments, purchases } from "@/db/schema";
import { sugerirCategoria } from "@/lib/categorizacao";
import { CARTAO_SEM_CATEGORIA, RESERVA, SEM_CATEGORIA } from "@/lib/categorias";
import type { Periodo } from "@/lib/periodo";
import { getFaturasDeMeses } from "./faturas";
import { contextoCategorizacao } from "./importacao";
import { listarAportesDoPeriodo } from "./reserva";
import { listarSaidas } from "./saidas";

export interface ItemCategoria {
  chave: string;
  tipo: "saida" | "compra" | "reserva";
  id: number;
  descricao: string;
  /** Data (saída/reserva) ou competência (compra). */
  data: string;
  valorCents: number;
  detalhe: string;
  editavel: boolean;
  sugestao: string | null;
}

export interface FaltaNoCartao {
  cartao: string;
  competencia: string;
  faturaCents: number;
  lancadoCents: number;
  diferencaCents: number;
}

/** Lançamentos de uma categoria no período, prontos para recategorizar. */
export async function getLancamentosCategoria(periodo: Periodo, nome: string) {
  const semCategoria = nome === SEM_CATEGORIA;

  if (nome === RESERVA) {
    const aportes = await listarAportesDoPeriodo(periodo);
    // Líquido, como no "Guardou": resgates entram negativos.
    const itens: ItemCategoria[] = aportes
      .map((a) => ({
        chave: `r${a.id}`,
        tipo: "reserva",
        id: a.id,
        descricao: a.descricao || (a.valorCents >= 0 ? "Guardado na reserva" : "Resgate da reserva"),
        data: a.data,
        valorCents: a.valorCents,
        detalhe: a.valorCents >= 0 ? "aporte" : "resgate",
        editavel: false,
        sugestao: null,
      }));
    return { itens, faltaNoCartao: [] as FaltaNoCartao[] };
  }

  if (nome === CARTAO_SEM_CATEGORIA) {
    // Parte das faturas que não tem compra lançada: só se resolve importando a fatura.
    const mapa = await getFaturasDeMeses(periodo.competencias);
    const faltaNoCartao: FaltaNoCartao[] = [];
    for (const [competencia, lista] of mapa) {
      for (const f of lista) {
        const diferenca = f.valorCents - f.somaParcelasCents;
        if (diferenca > 0) {
          faltaNoCartao.push({
            cartao: f.card.nome,
            competencia,
            faturaCents: f.valorCents,
            lancadoCents: f.somaParcelasCents,
            diferencaCents: diferenca,
          });
        }
      }
    }
    return { itens: [] as ItemCategoria[], faltaNoCartao };
  }

  const ctx = semCategoria ? await contextoCategorizacao() : null;
  const sugerir = (d: string) => (ctx ? (sugerirCategoria(d, ctx)?.categoria ?? null) : null);

  const [saidas, parcelas] = await Promise.all([
    listarSaidas(periodo, { categoria: nome, ordem: "data_desc" }),
    db
      .select({
        purchaseId: purchases.id,
        descricao: purchases.descricao,
        qtd: purchases.qtdParcelas,
        numero: installments.numero,
        competencia: installments.competencia,
        valorCents: installments.valorCents,
        cartao: cards.nome,
      })
      .from(installments)
      .innerJoin(purchases, eq(installments.purchaseId, purchases.id))
      .innerJoin(cards, eq(purchases.cardId, cards.id))
      .where(
        and(
          inArray(installments.competencia, periodo.competencias),
          semCategoria ? isNull(purchases.categoria) : eq(purchases.categoria, nome),
        ),
      ),
  ]);

  const porCompra = new Map<number, ItemCategoria>();
  for (const p of parcelas) {
    const atual = porCompra.get(p.purchaseId);
    if (atual) {
      atual.valorCents += Number(p.valorCents);
      continue;
    }
    porCompra.set(p.purchaseId, {
      chave: `c${p.purchaseId}`,
      tipo: "compra",
      id: p.purchaseId,
      descricao: p.descricao,
      data: p.competencia,
      valorCents: Number(p.valorCents),
      detalhe: p.qtd > 1 ? `${p.cartao} · ${p.numero}/${p.qtd}` : p.cartao,
      editavel: true,
      sugestao: sugerir(p.descricao),
    });
  }

  const itens: ItemCategoria[] = [
    ...saidas.map<ItemCategoria>((s) => ({
      chave: `s${s.id}`,
      tipo: "saida",
      id: s.id,
      descricao: s.descricao,
      data: s.data,
      valorCents: s.valorCents,
      detalhe: s.id < 0 ? "conta fixa prevista" : s.recorrenciaId ? "conta fixa" : (s.pagador?.nome ?? "saída"),
      editavel: s.id > 0,
      sugestao: s.id > 0 ? sugerir(s.descricao) : null,
    })),
    ...porCompra.values(),
  ].sort((a, b) => b.valorCents - a.valorCents);

  return { itens, faltaNoCartao: [] as FaltaNoCartao[] };
}
