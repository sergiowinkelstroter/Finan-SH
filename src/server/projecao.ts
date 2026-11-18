import "server-only";

import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { expenses, purchases } from "@/db/schema";
import { addMesesCompetencia, competenciaAtualISO, competenciaLabel, competenciaLabelCurta, hojeISO } from "@/lib/dates";
import { SEM_CATEGORIA } from "@/lib/categorias";
import { format, getDaysInMonth, lastDayOfMonth, parseISO } from "date-fns";
import { getFaturasDeMeses } from "./faturas";
import { entradasPorMes } from "./entradas";
import { tetosPorMes } from "./orcamento";
import { recorrenciasPorMes } from "./recorrencias";
import { getAporteDoMes, getAportePlanejado } from "./reserva";

export interface LinhaProjecao {
  competencia: string;
  label: string;
  labelCurto: string;
  comprometidoCents: number; // parcelas de cartão
  recorrentesCents: number; // contas fixas recorrentes
  saidasVariaveisCents: number; // saídas avulsas atuais ou estimadas
  reservaCents: number; // quanto vai para a reserva (saída do mês)
  entradasCents: number;
  tetoCents: number;
  saldoProjetadoCents: number; // entradas menos compromissos e despesas estimadas
  saldoAcumuladoCents: number;
  atual: boolean;
}

export interface Projecao {
  linhas: LinhaProjecao[];
  estimativasVariaveis: { chave: string; categoria: string | null; label: string; mediaMensalCents: number; atualCents: number }[];
  proporcaoRestanteMesAtual: number;
  aportePlanejadoCents: number;
  aporteMesAtualCents: number;
  totalEntradasCents: number;
  totalComprometidoCents: number;
  piorMes: LinhaProjecao | null;
  mesesNegativos: number;
}

export async function getProjecao(meses = 12): Promise<Projecao> {
  const inicio = competenciaAtualISO();
  const comps = Array.from({ length: meses }, (_, i) => addMesesCompetencia(inicio, i));
  const inicioHistorico = addMesesCompetencia(inicio, -3);
  const hoje = hojeISO();
  const fimMesAtual = format(lastDayOfMonth(parseISO(inicio)), "yyyy-MM-dd");
  const [faturas, entradas, tetos, recorrentes, historico, atuais, aportePlanejadoCents, aporteMesAtualCents, cartaoAVista] = await Promise.all([
    // Mesmo critério da planilha: valor efetivo da fatura (fechado/parcial/parcelas).
    getFaturasDeMeses(comps),
    entradasPorMes(comps),
    tetosPorMes(comps),
    recorrenciasPorMes(comps),
    db.query.expenses.findMany({
      where: and(gte(expenses.data, inicioHistorico), lt(expenses.data, inicio), isNull(expenses.recorrenciaId)),
      columns: { categoria: true, valorCents: true, data: true },
    }),
    // Mês atual inteiro (inclui saídas lançadas com data futura, como o Início).
    db.query.expenses.findMany({
      where: and(gte(expenses.data, inicio), lte(expenses.data, fimMesAtual), isNull(expenses.recorrenciaId)),
      columns: { categoria: true, valorCents: true },
    }),
    getAportePlanejado(),
    getAporteDoMes(inicio),
    // Compras à vista no cartão dos últimos meses: também são gasto variável e
    // não existem como parcela futura — sem isso o futuro fica otimista demais.
    db
      .select({ categoria: purchases.categoria, valorCents: purchases.valorTotalCents, competencia: purchases.primeiraCompetencia })
      .from(purchases)
      .where(
        and(
          eq(purchases.qtdParcelas, 1),
          gte(purchases.primeiraCompetencia, inicioHistorico),
          lt(purchases.primeiraCompetencia, inicio),
        ),
      ),
  ]);
  const comprometidoMapa = new Map(
    comps.map((c) => [c, (faturas.get(c) ?? []).reduce((s, f) => s + f.valorCents, 0)]),
  );

  const porCategoria = new Map<string, { categoria: string | null; historicoCents: number; atualCents: number }>();
  const mesesComDados = new Set<string>();
  for (const e of historico) mesesComDados.add(e.data.slice(0, 7));
  for (const c of cartaoAVista) mesesComDados.add(c.competencia.slice(0, 7));
  // Divide pelos meses que têm lançamento (quem começou há 1 mês não fica com 1/3 do real).
  const mesesHistorico = Math.min(3, Math.max(1, mesesComDados.size));
  for (const e of [...historico, ...cartaoAVista.map((c) => ({ ...c, valorCents: Number(c.valorCents) }))]) {
    const chave = e.categoria ?? "__sem_categoria__";
    const item = porCategoria.get(chave) ?? { categoria: e.categoria, historicoCents: 0, atualCents: 0 };
    item.historicoCents += e.valorCents;
    porCategoria.set(chave, item);
  }
  for (const e of atuais) {
    const chave = e.categoria ?? "__sem_categoria__";
    const item = porCategoria.get(chave) ?? { categoria: e.categoria, historicoCents: 0, atualCents: 0 };
    item.atualCents += e.valorCents;
    porCategoria.set(chave, item);
  }
  const estimativasVariaveis = [...porCategoria.entries()].map(([chave, item]) => ({
    chave,
    categoria: item.categoria,
    label: item.categoria ?? SEM_CATEGORIA,
    mediaMensalCents: Math.round(item.historicoCents / mesesHistorico),
    atualCents: item.atualCents,
  })).sort((a, b) => b.mediaMensalCents - a.mediaMensalCents || a.label.localeCompare(b.label, "pt-BR"));
  const dia = Number(hoje.slice(8, 10));
  const proporcaoRestanteMesAtual = Math.max(0, getDaysInMonth(parseISO(inicio)) - dia) / getDaysInMonth(parseISO(inicio));

  let acumulado = 0;
  const linhas = comps.map<LinhaProjecao>((competencia, i) => {
    const comprometidoCents = comprometidoMapa.get(competencia) ?? 0;
    const recorrentesCents = recorrentes.get(competencia) ?? 0;
    const entradasCents = entradas.get(competencia) ?? 0;
    const saidasVariaveisCents = estimativasVariaveis.reduce((s, e) =>
      s + (i === 0 ? e.atualCents + Math.round(e.mediaMensalCents * proporcaoRestanteMesAtual) : e.mediaMensalCents), 0);
    const reservaCents = i === 0 ? Math.max(aporteMesAtualCents, aportePlanejadoCents) : aportePlanejadoCents;
    const saldoProjetadoCents = entradasCents - comprometidoCents - recorrentesCents - saidasVariaveisCents - reservaCents;
    acumulado += saldoProjetadoCents;
    return {
      competencia,
      label: competenciaLabel(competencia),
      labelCurto: competenciaLabelCurta(competencia),
      comprometidoCents,
      recorrentesCents,
      saidasVariaveisCents,
      reservaCents,
      entradasCents,
      tetoCents: tetos.get(competencia) ?? 0,
      saldoProjetadoCents,
      saldoAcumuladoCents: acumulado,
      atual: i === 0,
    };
  });

  const piorMes = linhas.reduce<LinhaProjecao | null>(
    (pior, l) => (!pior || l.saldoProjetadoCents < pior.saldoProjetadoCents ? l : pior),
    null,
  );
  return {
    linhas,
    estimativasVariaveis,
    proporcaoRestanteMesAtual,
    aportePlanejadoCents,
    aporteMesAtualCents,
    totalEntradasCents: linhas.reduce((s, l) => s + l.entradasCents, 0),
    totalComprometidoCents: linhas.reduce((s, l) => s + l.comprometidoCents + l.recorrentesCents + l.saidasVariaveisCents + l.reservaCents, 0),
    piorMes,
    mesesNegativos: linhas.filter((l) => l.saldoProjetadoCents < 0).length,
  };
}
