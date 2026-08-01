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
