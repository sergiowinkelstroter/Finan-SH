import "server-only";

import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { calcularRitmo, tipoMenosConfiavel, type TipoValor } from "@/lib/calculos";
import {
  addMesesCompetencia,
  competenciaLabelCurta,
  diaAtualNoMes,
  diasNoMes,
  parseDataISO,
} from "@/lib/dates";
import { format, lastDayOfMonth } from "date-fns";
import { getFaturasDoMes, type FaturaEfetiva } from "./faturas";
import { entradasDoMesCents } from "./entradas";
import { getTetoDoMes } from "./orcamento";
import { getReservaAtual } from "./reserva";
import { getComprometidoPorMes } from "./compras";

export interface ResumoMes {
  competencia: string;
  entradasCents: number;
  gastoCents: number;
  gastoTipo: TipoValor;
  tetoCents: number;
  disponivelCents: number;
  sobraCents: number;
  reservaAtualCents: number;
  faturas: FaturaEfetiva[];
  comprometidoProximosMeses: { competencia: string; label: string; valorCents: number }[];
  ritmo: { pctTeto: number; pctMes: number; ritmo: number };
  diaAtual: number;
  diasNoMes: number;
  estourouTeto: boolean;
}

async function gastoComExpensesDoMes(competencia: string) {
  const inicio = parseDataISO(competencia);
  const primeiroDiaISO = format(inicio, "yyyy-MM-dd");
  const ultimoDiaISO = format(lastDayOfMonth(inicio), "yyyy-MM-dd");

  const rows = await db.query.expenses.findMany({
    where: and(gte(expenses.data, primeiroDiaISO), lte(expenses.data, ultimoDiaISO)),
  });

  return rows.reduce((soma, e) => soma + e.valorCents, 0);
}

export async function getResumoMes(competencia: string): Promise<ResumoMes> {
  const [faturas, entradasCents, tetoCents, reservaAtualCents, gastoExpensesCents, comprometidoMapa] =
    await Promise.all([
      getFaturasDoMes(competencia, { soAtivos: true }),
      entradasDoMesCents(competencia),
      getTetoDoMes(competencia),
      getReservaAtual(),
      gastoComExpensesDoMes(competencia),
      getComprometidoPorMes(),
    ]);

  const gastoCartoesCents = faturas.reduce((soma, f) => soma + f.valorCents, 0);
  const gastoCents = gastoCartoesCents + gastoExpensesCents;
  const gastoTipo = tipoMenosConfiavel(faturas.map((f) => f.tipo));

  const disponivelCents = tetoCents - gastoCents;
  const sobraCents = entradasCents - gastoCents;

  const dia = diaAtualNoMes(competencia);
  const dias = diasNoMes(competencia);
  const ritmo = calcularRitmo({
    gastoCents,
    tetoCents,
    diaAtual: dia,
    diasNoMes: dias,
  });

  const comprometidoProximosMeses = [1, 2, 3].map((offset) => {
    const comp = addMesesCompetencia(competencia, offset);
    return {
      competencia: comp,
      label: competenciaLabelCurta(comp),
      valorCents: comprometidoMapa.get(comp) ?? 0,
    };
  });

  return {
    competencia,
    entradasCents,
    gastoCents,
    gastoTipo,
    tetoCents,
    disponivelCents,
    sobraCents,
    reservaAtualCents,
    faturas,
    comprometidoProximosMeses,
    ritmo,
    diaAtual: dia,
    diasNoMes: dias,
    estourouTeto: disponivelCents < 0,
  };
}
