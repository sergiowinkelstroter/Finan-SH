import "server-only";

import { addMesesCompetencia, competenciaAtualISO, competenciaLabel, competenciaLabelCurta } from "@/lib/dates";
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
  entradasCents: number;
  tetoCents: number;
  saldoProjetadoCents: number; // entradas − parcelas − recorrentes
  saldoAcumuladoCents: number;
  atual: boolean;
}

export interface Projecao {
  linhas: LinhaProjecao[];
  totalEntradasCents: number;
  totalComprometidoCents: number;
  piorMes: LinhaProjecao | null;
  mesesNegativos: number;
}

export async function getProjecao(meses = 12): Promise<Projecao> {
  const inicio = competenciaAtualISO();
  const comps = Array.from({ length: meses }, (_, i) => addMesesCompetencia(inicio, i));
  const [comprometidoMapa, entradas, tetos, recorrentes] = await Promise.all([
    getComprometidoPorMes(),
    entradasPorMes(comps),
    tetosPorMes(comps),
    recorrenciasPorMes(comps),
  ]);

  let acumulado = 0;
  const linhas = comps.map<LinhaProjecao>((competencia, i) => {
    const comprometidoCents = comprometidoMapa.get(competencia) ?? 0;
    const recorrentesCents = recorrentes.get(competencia) ?? 0;
    const entradasCents = entradas.get(competencia) ?? 0;
    const saldoProjetadoCents = entradasCents - comprometidoCents - recorrentesCents;
    acumulado += saldoProjetadoCents;
    return {
      competencia,
      label: competenciaLabel(competencia),
      labelCurto: competenciaLabelCurta(competencia),
      comprometidoCents,
      recorrentesCents,
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
    totalEntradasCents: linhas.reduce((s, l) => s + l.entradasCents, 0),
    totalComprometidoCents: linhas.reduce((s, l) => s + l.comprometidoCents + l.recorrentesCents, 0),
    piorMes,
    mesesNegativos: linhas.filter((l) => l.saldoProjetadoCents < 0).length,
  };
}
