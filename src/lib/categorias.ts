export const CATEGORIAS_PADRAO = [
  "Moradia",
  "Mercado",
  "Restaurantes",
  "Transporte",
  "Saúde",
  "Lazer",
  "Assinaturas",
  "Educação",
  "Compras",
  "Viagem",
  "Pets",
  "Outros",
] as const;

export const SEM_CATEGORIA = "Sem categoria";
export const CARTAO_SEM_CATEGORIA = "Cartão (outros)";

const PALETA = [
  "#6c4cf0", // violeta
  "#2e6be6", // azul
  "#0ea88c", // menta
  "#e2496b", // rosa
  "#f59e0b", // âmbar
  "#06b6d4", // ciano
  "#8b5cf6", // lilás
  "#84cc16", // lima
  "#f97316", // laranja
  "#14b8a6", // verde-água
  "#ec4899", // pink
  "#64748b", // ardósia
];

const CORES_FIXAS: Record<string, string> = {
  [SEM_CATEGORIA]: "#a8a6bd",
  [CARTAO_SEM_CATEGORIA]: "#8e8ba8",
};

/** Cor estável por nome de categoria (padrão primeiro, depois hash). */
export function corCategoria(nome: string): string {
  if (CORES_FIXAS[nome]) return CORES_FIXAS[nome];
  const idx = (CATEGORIAS_PADRAO as readonly string[]).indexOf(nome);
  if (idx >= 0) return PALETA[idx % PALETA.length];
  let h = 0;
  for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}

export function normalizarCategoria(valor: string | null | undefined): string | null {
  const v = valor?.trim();
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1);
}
