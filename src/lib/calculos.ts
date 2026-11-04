export type TipoValor = "real" | "parcial" | "estimado";

export interface ValorEfetivo {
  valorCents: number;
  tipo: TipoValor;
}

/**
 * Seção 4 do spec: precedência real > parcial > estimado.
 * O max() no caso parcial existe porque o valor digitado pode não ter
 * capturado ainda a parcela do mês — a parcela é compromisso certo, então
 * serve de piso. É max, não soma: nunca há duplo-cômputo.
 */
export function valorEfetivoCartao(params: {
  valorFechadoCents: number | null;
  valorParcialCents: number;
  somaParcelasCents: number;
}): ValorEfetivo {
  const { valorFechadoCents, valorParcialCents, somaParcelasCents } = params;

  if (valorFechadoCents != null) {
    return { valorCents: valorFechadoCents, tipo: "real" };
  }

  if (valorParcialCents > 0) {
    return {
      valorCents: Math.max(valorParcialCents, somaParcelasCents),
      tipo: "parcial",
    };
  }

  return { valorCents: somaParcelasCents, tipo: "estimado" };
}

const PRECEDENCIA_CONFIANCA: Record<TipoValor, number> = {
  real: 0,
  parcial: 1,
  estimado: 2,
};

/** gastoDoMes propaga o tipo menos confiável, para a UI sinalizar o dashboard inteiro. */
export function tipoMenosConfiavel(tipos: TipoValor[]): TipoValor {
  return tipos.reduce<TipoValor>(
    (pior, atual) =>
      PRECEDENCIA_CONFIANCA[atual] > PRECEDENCIA_CONFIANCA[pior] ? atual : pior,
    "real",
  );
}

export function calcularRitmo(params: {
  gastoCents: number;
  tetoCents: number;
  diaAtual: number;
  diasNoMes: number;
}) {
  const { gastoCents, tetoCents, diaAtual, diasNoMes } = params;
  const pctTeto = tetoCents > 0 ? gastoCents / tetoCents : 0;
  const pctMes = diasNoMes > 0 ? diaAtual / diasNoMes : 0;
  return { pctTeto, pctMes, ritmo: pctTeto - pctMes };
}

/**
 * Divisão de parcelas com resto: base = floor(total/qtd), a primeira parcela
 * absorve o resto (padrão BR de parcelamento em cartão).
 */
export function gerarValoresParcelas(
  valorTotalCents: number,
  qtdParcelas: number,
): number[] {
  const base = Math.floor(valorTotalCents / qtdParcelas);
  const resto = valorTotalCents - base * qtdParcelas;
  const parcelas = new Array(qtdParcelas).fill(base) as number[];
  parcelas[0] += resto;
  return parcelas;
}

/**
 * saldo_t = saldo_(t-1) * (1 + taxaMensal) + aporteMensal
 * taxaMensal = (1 + taxaAA)^(1/12) - 1
 */
export function projecaoReserva(params: {
  saldoInicialCents: number;
  aporteMensalCents: number;
  meses: number;
  taxaAA?: number;
}): number[] {
  const { saldoInicialCents, aporteMensalCents, meses, taxaAA = 0 } = params;
  const taxaMensal = Math.pow(1 + taxaAA, 1 / 12) - 1;
  const saldos: number[] = [];
  let saldo = saldoInicialCents;
  for (let t = 0; t < meses; t++) {
    saldo = saldo * (1 + taxaMensal) + aporteMensalCents;
    saldos.push(Math.round(saldo));
  }
  return saldos;
}

export interface Pagamento {
  userId: number;
  cents: number;
}

export interface Acerto {
  totalCents: number;
  porPessoa: { userId: number; pagouCents: number; saldoCents: number }[];
  /** Quem deve e para quem, em centavos (null se estiver zerado ou houver != 2 pessoas). */
  transferencia: { deUserId: number; paraUserId: number; cents: number } | null;
}

/**
 * Acerto 50/50 entre as pessoas: cada uma "deveria" ter pago total/n.
 * saldo > 0 → pagou a mais (tem a receber); saldo < 0 → deve.
 */
export function calcularAcerto(pagamentos: Pagamento[], userIds: number[]): Acerto {
  const pagou = new Map<number, number>(userIds.map((id) => [id, 0]));
  for (const p of pagamentos) {
    if (pagou.has(p.userId)) pagou.set(p.userId, pagou.get(p.userId)! + p.cents);
  }
  const totalCents = [...pagou.values()].reduce((a, b) => a + b, 0);
  const cota = userIds.length > 0 ? totalCents / userIds.length : 0;
  const porPessoa = userIds.map((userId) => ({
    userId,
    pagouCents: pagou.get(userId)!,
    saldoCents: Math.round(pagou.get(userId)! - cota),
  }));

  let transferencia: Acerto["transferencia"] = null;
  if (porPessoa.length === 2) {
    const [a, b] = porPessoa;
    if (a.saldoCents > 0) {
      transferencia = { deUserId: b.userId, paraUserId: a.userId, cents: a.saldoCents };
    } else if (b.saldoCents > 0) {
      transferencia = { deUserId: a.userId, paraUserId: b.userId, cents: b.saldoCents };
    }
  }
  return { totalCents, porPessoa, transferencia };
}

/** Variação relativa (atual vs anterior). null quando não há base de comparação. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / Math.abs(anterior);
}

/**
 * Data de vencimento da fatura de uma competência. Se o vencimento é antes do
 * fechamento no calendário, a fatura vence no mês seguinte ao do fechamento.
 */
export function vencimentoFatura(params: {
  competencia: string; // yyyy-MM-01
  diaFechamento: number;
  diaVencimento: number;
}): string {
  const { competencia, diaFechamento, diaVencimento } = params;
  const [ano, mes] = competencia.split("-").map(Number);
  const deslocar = diaVencimento < diaFechamento ? 1 : 0;
  const base = new Date(Date.UTC(ano, mes - 1 + deslocar, 1));
  const ultimo = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const dia = Math.min(diaVencimento, ultimo);
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  return `${base.getUTCFullYear()}-${mm}-${String(dia).padStart(2, "0")}`;
}

export interface ProgressoMeta {
  pct: number; // 0..1+ (pode passar de 1)
  faltaCents: number;
  atingida: boolean;
  /** Meses até atingir no ritmo médio atual (null se o ritmo é zero/negativo). */
  mesesNoRitmo: number | null;
  /** Aporte mensal necessário para cumprir o prazo (null sem prazo ou prazo vencido). */
  aporteNecessarioCents: number | null;
}

export function calcularProgressoMeta(params: {
  saldoCents: number;
  metaCents: number;
  aporteMedioMensalCents: number;
  mesesAtePrazo: number | null;
}): ProgressoMeta {
  const { saldoCents, metaCents, aporteMedioMensalCents, mesesAtePrazo } = params;
  const faltaCents = Math.max(0, metaCents - saldoCents);
  const atingida = faltaCents === 0;
  return {
    pct: metaCents > 0 ? saldoCents / metaCents : 0,
    faltaCents,
    atingida,
    mesesNoRitmo:
      atingida ? 0 : aporteMedioMensalCents > 0 ? Math.ceil(faltaCents / aporteMedioMensalCents) : null,
    aporteNecessarioCents:
      !atingida && mesesAtePrazo != null && mesesAtePrazo > 0
        ? Math.ceil(faltaCents / mesesAtePrazo)
        : null,
  };
}
