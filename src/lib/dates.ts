import {
  addMonths,
  format,
  getDate,
  getDaysInMonth,
  parseISO,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

export const TIMEZONE = "America/Sao_Paulo";

/** "Agora" no fuso America/Sao_Paulo — base para tudo que depende de "mês atual". */
export function agoraSaoPaulo(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function hojeISO(): string {
  return format(agoraSaoPaulo(), "yyyy-MM-dd");
}

/** Competência (dia 1) do mês atual, no fuso America/Sao_Paulo. */
export function competenciaAtualISO(): string {
  return format(startOfMonth(agoraSaoPaulo()), "yyyy-MM-dd");
}

/**
 * Parseia uma data-only ISO ("2026-08-01") como data local, nunca via UTC —
 * `new Date(string)` deslocaria um dia em fusos negativos. Sempre usar isto.
 */
export function parseDataISO(iso: string): Date {
  return parseISO(iso);
}

export function addMesesCompetencia(competencia: string, meses: number): string {
  return format(addMonths(parseDataISO(competencia), meses), "yyyy-MM-dd");
}

export function competenciaLabel(competencia: string): string {
  const texto = format(parseDataISO(competencia), "MMMM yyyy", { locale: ptBR });
  return texto;
}

export function competenciaLabelCurta(competencia: string): string {
  return format(parseDataISO(competencia), "MMM", { locale: ptBR }).replace(".", "");
}

export function diasNoMes(competencia: string): number {
  return getDaysInMonth(parseDataISO(competencia));
}

export function diaAtualNoMes(competencia: string): number {
  const hoje = agoraSaoPaulo();
  const isMesAtual = format(hoje, "yyyy-MM") === competencia.slice(0, 7);
  if (isMesAtual) return getDate(hoje);
  // mês passado/futuro: não há "dia atual" real — usa o total de dias (100%) ou 0
  return hoje > parseDataISO(competencia) ? diasNoMes(competencia) : 0;
}

export function formatDataCurta(iso: string): string {
  return format(parseDataISO(iso), "dd/MM/yyyy");
}

export function diasDesde(iso: string): number {
  const hoje = agoraSaoPaulo();
  const data = parseDataISO(iso);
  const ms = hoje.getTime() - data.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
