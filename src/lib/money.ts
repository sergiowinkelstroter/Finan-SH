const formatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata centavos (inteiro) para "R$ 1.234,56". Única porta de saída de dinheiro. */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

export function formatCentsSemSimbolo(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Aceita "1234,56", "1.234,56" ou "1234.56" digitados pelo usuário. */
export function parseReaisParaCents(input: string): number {
  const limpo = input.trim().replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;

  let normalizado = limpo;
  const temVirgula = normalizado.includes(",");
  const temPonto = normalizado.includes(".");

  if (temVirgula && temPonto) {
    normalizado = normalizado.replace(/\./g, "").replace(",", ".");
  } else if (temVirgula) {
    normalizado = normalizado.replace(",", ".");
  }

  const valor = Number.parseFloat(normalizado);
  if (Number.isNaN(valor)) return 0;
  return Math.round(valor * 100);
}

/** "R$ 1,2 mil" / "R$ 850" — para rótulos de gráfico. */
export function formatCompacto(cents: number): string {
  const reais = Math.abs(cents) / 100;
  const sinal = cents < 0 ? "-" : "";
  if (reais >= 1_000_000) return `${sinal}${(reais / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (reais >= 10_000) return `${sinal}${Math.round(reais / 1000)} mil`;
  if (reais >= 1_000) return `${sinal}${(reais / 1000).toFixed(1).replace(".", ",")} mil`;
  return `${sinal}${Math.round(reais)}`;
}

export function formatPercentual(fracao: number, casas = 0): string {
  return `${(fracao * 100).toFixed(casas).replace(".", ",")}%`;
}
