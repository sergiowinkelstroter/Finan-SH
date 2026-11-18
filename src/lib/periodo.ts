import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfYear,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { agoraSaoPaulo } from "./dates";

/**
 * Período selecionado numa tela: um mês fechado ou um intervalo livre de dias.
 * Vive na URL (?mes=2026-08 ou ?de=2026-08-01&ate=2026-08-15) para ser
 * compartilhável e funcionar em Server Components.
 */
export interface Periodo {
  modo: "mes" | "intervalo";
  /** Primeiro dia (yyyy-MM-dd). */
  de: string;
  /** Último dia (yyyy-MM-dd). */
  ate: string;
  /** Dia 1 do mês de `de` — competência principal. */
  competencia: string;
  /** Todas as competências (dia 1) que o período toca. */
  competencias: string[];
  label: string;
}

export type PeriodoParams = { mes?: string; de?: string; ate?: string };

const MAX_DIAS = 731;
const iso = (d: Date) => format(d, "yyyy-MM-dd");

function dataValida(valor: string | undefined): Date | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = parseISO(valor);
  return isValid(d) ? d : null;
}

function mesValido(valor: string | undefined): Date | null {
  if (!valor) return null;
  const m = /^(\d{4}-\d{2})(-01)?$/.exec(valor);
  if (!m) return null;
  const d = parseISO(`${m[1]}-01`);
  return isValid(d) ? d : null;
}

export function competenciasEntre(de: string, ate: string): string[] {
  const out: string[] = [];
  let cursor = startOfMonth(parseISO(de));
  const fim = parseISO(ate);
  while (cursor <= fim) {
    out.push(iso(cursor));
    cursor = addMonths(cursor, 1);
  }
  return out;
}

function labelDe(modo: "mes" | "intervalo", de: Date, ate: Date): string {
  if (modo === "mes") return format(de, "MMMM yyyy", { locale: ptBR });
  const mesmoAno = de.getFullYear() === ate.getFullYear();
  const ini = format(de, mesmoAno ? "dd/MM" : "dd/MM/yyyy");
  return `${ini} – ${format(ate, "dd/MM/yyyy")}`;
}

export function montarPeriodo(
  modo: "mes" | "intervalo",
  de: Date,
  ate: Date,
): Periodo {
  const deISO = iso(de);
  const ateISO = iso(ate);
  return {
    modo,
    de: deISO,
    ate: ateISO,
    competencia: iso(startOfMonth(de)),
    competencias: competenciasEntre(deISO, ateISO),
    label: labelDe(modo, de, ate),
  };
}

export function periodoDoMes(mes: Date): Periodo {
  const ini = startOfMonth(mes);
  return montarPeriodo("mes", ini, endOfMonth(ini));
}

/** Lê e valida os parâmetros de URL; entrada inválida cai no mês atual. */
export function parsePeriodo(params: PeriodoParams): Periodo {
  const de = dataValida(params.de);
  const ate = dataValida(params.ate);
  if (de && ate) {
    let a = de;
    let b = ate;
    if (a > b) [a, b] = [b, a];
    if (differenceInCalendarDays(b, a) > MAX_DIAS) b = addDays(a, MAX_DIAS);
    return montarPeriodo("intervalo", a, b);
  }
  const mes = mesValido(params.mes);
  if (mes) return periodoDoMes(mes);
  return periodoDoMes(agoraSaoPaulo());
}

/**
 * Quanto de uma competência (mês inteiro) cai dentro do período: 1 no modo mês;
 * num intervalo que começa/termina no meio do mês, a fração de dias.
 * Valores mensais (entradas, faturas, teto) são rateados por isso para não
 * misturar mês inteiro com saídas contadas por data exata.
 */
export function fracaoDoMes(p: Periodo, competencia: string): number {
  if (p.modo === "mes") return 1;
  const ini = parseISO(competencia);
  const fim = endOfMonth(ini);
  const a = parseISO(p.de) > ini ? parseISO(p.de) : ini;
  const b = parseISO(p.ate) < fim ? parseISO(p.ate) : fim;
  const dias = differenceInCalendarDays(b, a) + 1;
  return dias <= 0 ? 0 : Math.min(1, dias / (differenceInCalendarDays(fim, ini) + 1));
}

/** Período imediatamente anterior, com a mesma duração (base de comparações). */
export function periodoAnterior(p: Periodo): Periodo {
  if (p.modo === "mes") return periodoDoMes(addMonths(parseISO(p.de), -1));
  const dias = differenceInCalendarDays(parseISO(p.ate), parseISO(p.de)) + 1;
  const ate = subDays(parseISO(p.de), 1);
  return montarPeriodo("intervalo", subDays(ate, dias - 1), ate);
}

export function periodoProximo(p: Periodo): Periodo {
  if (p.modo === "mes") return periodoDoMes(addMonths(parseISO(p.de), 1));
  const dias = differenceInCalendarDays(parseISO(p.ate), parseISO(p.de)) + 1;
  const de = addDays(parseISO(p.ate), 1);
  return montarPeriodo("intervalo", de, addDays(de, dias - 1));
}

export function periodoParaQuery(p: Periodo): Record<string, string> {
  return p.modo === "mes"
    ? { mes: p.de.slice(0, 7) }
    : { de: p.de, ate: p.ate };
}

export type PresetPeriodo = "mes-atual" | "mes-passado" | "30d" | "90d" | "ano";

export function presetPeriodo(preset: PresetPeriodo): Periodo {
  const hoje = agoraSaoPaulo();
  switch (preset) {
    case "mes-atual":
      return periodoDoMes(hoje);
    case "mes-passado":
      return periodoDoMes(addMonths(hoje, -1));
    case "30d":
      return montarPeriodo("intervalo", subDays(hoje, 29), hoje);
    case "90d":
      return montarPeriodo("intervalo", subDays(hoje, 89), hoje);
    case "ano":
      return montarPeriodo("intervalo", startOfYear(hoje), hoje);
  }
}

/** Quantos dias o período tem (para médias por dia). */
export function diasDoPeriodo(p: Periodo): number {
  return differenceInCalendarDays(parseISO(p.ate), parseISO(p.de)) + 1;
}

/** Intersecção do dia `d` (yyyy-MM-dd) com o período. */
export function dentroDoPeriodo(p: Periodo, d: string): boolean {
  return d >= p.de && d <= p.ate;
}
