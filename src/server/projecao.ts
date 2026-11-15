import "server-only";

import { and, gte, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { addMesesCompetencia, competenciaAtualISO, competenciaLabel, competenciaLabelCurta, hojeISO } from "@/lib/dates";
import { SEM_CATEGORIA } from "@/lib/categorias";
import { getDaysInMonth, parseISO } from "date-fns";
import { getComprometidoPorMes } from "./compras";
import { entradasPorMes } from "./entradas";
import { tetosPorMes } from "./orcamento";
import { recorrenciasPorMes } from "./recorrencias";

export interface LinhaProjecao {
  competencia: string;
  label: string;
  labelCurto: string;
  comprometidoCents: number; // parcelas de cartão
  recorrentesCents: number; // contas fixas recorrentes
  saidasVariaveisCents: number; // saídas avulsas atuais ou estimadas
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
  const [comprometidoMapa, entradas, tetos, recorrentes, historico, atuais] = await Promise.all([
    getComprometidoPorMes(),
    entradasPorMes(comps),
    tetosPorMes(comps),
    recorrenciasPorMes(comps),
    db.query.expenses.findMany({
      where: and(gte(expenses.data, inicioHistorico), lt(expenses.data, inicio), isNull(expenses.recorrenciaId)),
      columns: { categoria: true, valorCents: true },
    }),
    db.query.expenses.findMany({
      where: and(gte(expenses.data, inicio), lte(expenses.data, hoje), isNull(expenses.recorrenciaId)),
      columns: { categoria: true, valorCents: true },
    }),
  ]);

  const porCategoria = new Map<string, { categoria: string | null; historicoCents: number; atualCents: number }>();
  for (const e of historico) {
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
    mediaMensalCents: Math.round(item.historicoCents / 3),
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
    const saldoProjetadoCents = entradasCents - comprometidoCents - recorrentesCents - saidasVariaveisCents;
    acumulado += saldoProjetadoCents;
    return {
      competencia,
      label: competenciaLabel(competencia),
      labelCurto: competenciaLabelCurta(competencia),
      comprometidoCents,
      recorrentesCents,
      saidasVariaveisCents,
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
    totalEntradasCents: linhas.reduce((s, l) => s + l.entradasCents, 0),
    totalComprometidoCents: linhas.reduce((s, l) => s + l.comprometidoCents + l.recorrentesCents + l.saidasVariaveisCents, 0),
    piorMes,
    mesesNegativos: linhas.filter((l) => l.saldoProjetadoCents < 0).length,
  };
}
