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
