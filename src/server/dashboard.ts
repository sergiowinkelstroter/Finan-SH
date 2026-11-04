import "server-only";

import { calcularRitmo, type TipoValor } from "@/lib/calculos";
import {
  addMesesCompetencia,
  competenciaLabelCurta,
  diaAtualNoMes,
  diasNoMes,
} from "@/lib/dates";
import { periodoDoMes } from "@/lib/periodo";
import { parseISO } from "date-fns";
import { getAnaliseComparada, type Analise } from "./analise";
import { getAlertasVencimento, type AlertaVencimento, type FaturaEfetiva } from "./faturas";
import { getComprometidoPorMes } from "./compras";
import { getReservaAtual } from "./reserva";
import { garantirRecorrencias } from "./recorrencias";

export interface ResumoMes {
  competencia: string;
  analise: Analise;
  deltaGasto: number | null;
  categoriasAnterior: Map<string, number>;
  entradasCents: number;
  gastoCents: number;
  gastoTipo: TipoValor;
  tetoCents: number;
  disponivelCents: number;
  sobraCents: number;
  reservaAtualCents: number;
  faturas: FaturaEfetiva[];
  alertas: AlertaVencimento[];
  comprometidoProximosMeses: { competencia: string; label: string; valorCents: number }[];
  ritmo: { pctTeto: number; pctMes: number; ritmo: number };
  diaAtual: number;
  diasNoMes: number;
  estourouTeto: boolean;
}

export async function getResumoMes(competencia: string): Promise<ResumoMes> {
  await garantirRecorrencias();
  const periodo = periodoDoMes(parseISO(competencia));
  const [comparada, reservaAtualCents, comprometidoMapa, alertas] = await Promise.all([
    getAnaliseComparada(periodo),
    getReservaAtual(),
    getComprometidoPorMes(),
    getAlertasVencimento(),
  ]);
  const { atual } = comparada;

  const gastoCents = atual.gastoCents;
  const tetoCents = atual.tetoCents;
  const disponivelCents = tetoCents - gastoCents;
  const dia = diaAtualNoMes(competencia);
  const dias = diasNoMes(competencia);

  return {
    competencia,
    analise: atual,
    deltaGasto: comparada.deltaGasto,
    categoriasAnterior: comparada.categoriasAnterior,
    entradasCents: atual.entradasCents,
    gastoCents,
    gastoTipo: atual.gastoTipo,
    tetoCents,
    disponivelCents,
    sobraCents: atual.sobraCents,
    reservaAtualCents,
    faturas: atual.faturasPorMes.get(competencia) ?? [],
    alertas,
    comprometidoProximosMeses: [1, 2, 3].map((offset) => {
      const comp = addMesesCompetencia(competencia, offset);
      return {
        competencia: comp,
        label: competenciaLabelCurta(comp),
        valorCents: comprometidoMapa.get(comp) ?? 0,
      };
    }),
    ritmo: calcularRitmo({ gastoCents, tetoCents, diaAtual: dia, diasNoMes: dias }),
    diaAtual: dia,
    diasNoMes: dias,
    estourouTeto: disponivelCents < 0,
  };
}
