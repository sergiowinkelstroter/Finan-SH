import "server-only";

import { addMesesCompetencia, competenciaAtualISO, competenciaLabel } from "@/lib/dates";
import { getComprometidoPorMes } from "./compras";
import { entradasDoMesCents } from "./entradas";
import { getTetoDoMes } from "./orcamento";

export interface LinhaProjecao {
  competencia: string;
  label: string;
  comprometidoCents: number;
  entradasCents: number;
  tetoCents: number;
  saldoProjetadoCents: number;
}

export async function getProjecao(meses = 12): Promise<LinhaProjecao[]> {
  const inicio = competenciaAtualISO();
  const comprometidoMapa = await getComprometidoPorMes();

  const linhas: LinhaProjecao[] = [];
  for (let i = 0; i < meses; i++) {
    const competencia = addMesesCompetencia(inicio, i);
    const [entradasCents, tetoCents] = await Promise.all([
      entradasDoMesCents(competencia),
      getTetoDoMes(competencia),
    ]);
    const comprometidoCents = comprometidoMapa.get(competencia) ?? 0;

    linhas.push({
      competencia,
      label: competenciaLabel(competencia),
      comprometidoCents,
      entradasCents,
      tetoCents,
      saldoProjetadoCents: entradasCents - comprometidoCents,
    });
  }

  return linhas;
}
