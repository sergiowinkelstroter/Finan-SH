/**
 * Categorização automática por descrição: regras do casal > histórico > dicionário.
 * Funções puras; o servidor injeta regras e histórico.
 */

export type FonteCategoria = "regra" | "historico" | "padrao";

/** Maiúsculas, sem acento, sem número de parcela, sem pontuação. */
export function normalizarDescricao(descricao: string): string {
  return descricao
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/PARC(ELA)?\.?\s*\d{1,2}\s*(\/|DE)\s*\d{1,2}/g, " ")
    .replace(/\b\d{1,2}\s*\/\s*\d{1,2}\b/g, " ")
    .replace(/[*_.,;:/\\|()\-#'"]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PREFIXOS_RUIDO = new Set([
  "PAG", "PAGTO", "PAGAMENTO", "COMPRA", "COMPRAS", "CARTAO", "DEBITO", "CREDITO", "PIX", "ENVIADO",
  "TRANSFERENCIA", "TED", "DOC", "MP", "PG", "EC", "EBW", "PAYPAL", "APLICACAO", "NO", "ESTABELECIMENTO",
]);

/**
 * "Chave do estabelecimento": as duas primeiras palavras relevantes.
 * "PAG*IFOOD SAO PAULO" → "IFOOD SAO"; usada para histórico e regras novas.
 */
export function chaveEstabelecimento(descricao: string): string {
  const tokens = normalizarDescricao(descricao)
    .split(" ")
    .filter((t) => t && !PREFIXOS_RUIDO.has(t) && !/^\d+$/.test(t));
  return tokens.slice(0, 2).join(" ");
}

/** Dicionário de estabelecimentos comuns no Brasil → categoria padrão. */
const DICIONARIO: [string, string][] = [
  // Restaurantes / delivery
  ["IFOOD", "Restaurantes"], ["IFD", "Restaurantes"], ["RAPPI", "Restaurantes"], ["ZE DELIVERY", "Restaurantes"],
  ["RESTAUR", "Restaurantes"], ["LANCHON", "Restaurantes"], ["PADARIA", "Restaurantes"], ["PANIFIC", "Restaurantes"],
  ["BURGER", "Restaurantes"], ["MCDONALDS", "Restaurantes"], ["MC DONALDS", "Restaurantes"], ["PIZZ", "Restaurantes"],
  ["CAFE", "Restaurantes"], ["CAFETERIA", "Restaurantes"], ["STARBUCKS", "Restaurantes"], ["OUTBACK", "Restaurantes"],
  ["SUBWAY", "Restaurantes"], ["HABIBS", "Restaurantes"], ["BAR", "Restaurantes"], ["CHURRASC", "Restaurantes"],
  ["SORVET", "Restaurantes"], ["ACAI", "Restaurantes"], ["BOTEC", "Restaurantes"],
  // Mercado
  ["SUPERMERC", "Mercado"], ["MERCADO", "Mercado"], ["CARREFOUR", "Mercado"], ["ASSAI", "Mercado"],
  ["ATACADAO", "Mercado"], ["ATACAD", "Mercado"], ["PAO DE ACUCAR", "Mercado"], ["HORTIFRUTI", "Mercado"],
  ["SONDA", "Mercado"], ["ZAFFARI", "Mercado"], ["DIA BRASIL", "Mercado"], ["SAMS CLUB", "Mercado"],
  ["OXXO", "Mercado"], ["SACOLAO", "Mercado"], ["ACOUGUE", "Mercado"], ["HIPERMERC", "Mercado"],
  // Transporte
  ["UBER", "Transporte"], ["99APP", "Transporte"], ["99 POP", "Transporte"], ["99 TAXI", "Transporte"],
  ["CABIFY", "Transporte"], ["POSTO", "Transporte"], ["SHELL", "Transporte"], ["IPIRANGA", "Transporte"],
  ["PETROBRAS", "Transporte"], ["ESTAPAR", "Transporte"], ["ESTACIONAMENTO", "Transporte"], ["SEM PARAR", "Transporte"],
  ["CONECTCAR", "Transporte"], ["VELOE", "Transporte"], ["METRO", "Transporte"], ["BILHETE UNICO", "Transporte"],
  ["COMBUST", "Transporte"], ["AUTO POSTO", "Transporte"],
  // Assinaturas
  ["NETFLIX", "Assinaturas"], ["SPOTIFY", "Assinaturas"], ["AMAZON PRIME", "Assinaturas"], ["PRIME VIDEO", "Assinaturas"],
  ["DISNEY", "Assinaturas"], ["HBO", "Assinaturas"], ["MAX COM", "Assinaturas"], ["YOUTUBE", "Assinaturas"],
  ["APPLE COM", "Assinaturas"], ["APPLE COM BILL", "Assinaturas"], ["GOOGLE ONE", "Assinaturas"], ["GOOGLE STORAGE", "Assinaturas"],
  ["DEEZER", "Assinaturas"], ["GLOBOPLAY", "Assinaturas"], ["PARAMOUNT", "Assinaturas"], ["CRUNCHYROLL", "Assinaturas"],
  ["CHATGPT", "Assinaturas"], ["OPENAI", "Assinaturas"], ["MICROSOFT", "Assinaturas"], ["ADOBE", "Assinaturas"],
  ["CLAUDE AI", "Assinaturas"], ["ANTHROPIC", "Assinaturas"], ["SMARTFIT", "Saúde"], ["SMART FIT", "Saúde"],
  // Saúde
  ["DROGA", "Saúde"], ["DROGARIA", "Saúde"], ["FARMA", "Saúde"], ["RAIA", "Saúde"], ["PANVEL", "Saúde"],
  ["PAGUE MENOS", "Saúde"], ["HOSPITAL", "Saúde"], ["CLINICA", "Saúde"], ["LABORAT", "Saúde"], ["UNIMED", "Saúde"],
  ["ODONTO", "Saúde"], ["ACADEMIA", "Saúde"], ["GYMPASS", "Saúde"], ["WELLHUB", "Saúde"],
  // Compras
  ["AMAZON", "Compras"], ["MERCADOLIVRE", "Compras"], ["MERCADO LIVRE", "Compras"], ["MERCADOPAGO", "Compras"],
  ["SHOPEE", "Compras"], ["MAGALU", "Compras"], ["MAGAZINE", "Compras"], ["ALIEXPRESS", "Compras"],
  ["SHEIN", "Compras"], ["RENNER", "Compras"], ["RIACHUELO", "Compras"], ["CEA", "Compras"], ["C A MODAS", "Compras"],
  ["CENTAURO", "Compras"], ["DECATHLON", "Compras"], ["KABUM", "Compras"], ["AMERICANAS", "Compras"],
  ["CASAS BAHIA", "Compras"], ["LEROY", "Compras"], ["TOKSTOK", "Compras"], ["ZARA", "Compras"], ["NETSHOES", "Compras"],
  // Lazer
  ["CINEMA", "Lazer"], ["CINEMARK", "Lazer"], ["INGRESSO", "Lazer"], ["SYMPLA", "Lazer"], ["EVENTIM", "Lazer"],
  ["STEAM", "Lazer"], ["PLAYSTATION", "Lazer"], ["XBOX", "Lazer"], ["NINTENDO", "Lazer"], ["TEATRO", "Lazer"],
  // Pets
  ["PETZ", "Pets"], ["COBASI", "Pets"], ["PET SHOP", "Pets"], ["PETSHOP", "Pets"], ["VETERIN", "Pets"],
  // Viagem
  ["LATAM", "Viagem"], ["GOL LINHAS", "Viagem"], ["AZUL LINHAS", "Viagem"], ["AIRBNB", "Viagem"], ["BOOKING", "Viagem"],
  ["HOTEL", "Viagem"], ["DECOLAR", "Viagem"], ["POUSADA", "Viagem"], ["123MILHAS", "Viagem"], ["LOCALIZA", "Viagem"],
  ["MOVIDA", "Viagem"], ["RODOVIARIA", "Viagem"], ["BUSER", "Viagem"],
  // Educação
  ["ESCOLA", "Educação"], ["COLEGIO", "Educação"], ["CURSO", "Educação"], ["UDEMY", "Educação"], ["ALURA", "Educação"],
  ["FACULDADE", "Educação"], ["UNIVERSIDADE", "Educação"], ["LIVRARIA", "Educação"], ["DUOLINGO", "Educação"],
  // Moradia / contas da casa
  ["ENEL", "Moradia"], ["CPFL", "Moradia"], ["LIGHT SA", "Moradia"], ["SABESP", "Moradia"], ["CEMIG", "Moradia"],
  ["COPEL", "Moradia"], ["CELESC", "Moradia"], ["COMGAS", "Moradia"], ["CONDOMINIO", "Moradia"], ["ALUGUEL", "Moradia"],
  ["VIVO", "Moradia"], ["CLARO", "Moradia"], ["TIM", "Moradia"], ["NET SERVICOS", "Moradia"], ["SANEPAR", "Moradia"],
];

const DICIONARIO_TOKENS = DICIONARIO.map(([p, c]) => ({ tokens: p.split(" "), categoria: c, tam: p.length })).sort(
  (a, b) => b.tam - a.tam,
);

/** Casa padrão por palavras: palavras curtas (≤3) exigem igualdade; as longas, prefixo. */
function casaTokens(alvo: string[], padrao: string[]): boolean {
  for (let i = 0; i + padrao.length <= alvo.length; i++) {
    let ok = true;
    for (let j = 0; j < padrao.length; j++) {
      const a = alvo[i + j];
      const p = padrao[j];
      if (p.length <= 3 ? a !== p : !a.startsWith(p)) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

export function categoriaPadrao(descricao: string): string | null {
  const tokens = normalizarDescricao(descricao).split(" ");
  for (const d of DICIONARIO_TOKENS) if (casaTokens(tokens, d.tokens)) return d.categoria;
  return null;
}

export interface Regra {
  padrao: string; // já normalizado
  categoria: string;
}

export interface ContextoCategorizacao {
  regras: Regra[];
  /** chaveEstabelecimento → categoria mais usada no histórico. */
  historico: Map<string, string>;
}

/** Monta o mapa de histórico a partir de lançamentos já categorizados. */
export function montarHistorico(itens: { descricao: string; categoria: string | null }[]): Map<string, string> {
  const contagem = new Map<string, Map<string, number>>();
  for (const it of itens) {
    if (!it.categoria) continue;
    const k = chaveEstabelecimento(it.descricao);
    if (!k) continue;
    const m = contagem.get(k) ?? new Map<string, number>();
    m.set(it.categoria, (m.get(it.categoria) ?? 0) + 1);
    contagem.set(k, m);
  }
  const out = new Map<string, string>();
  for (const [k, m] of contagem) out.set(k, [...m.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  return out;
}

export function sugerirCategoria(
  descricao: string,
  ctx: ContextoCategorizacao,
): { categoria: string; fonte: FonteCategoria } | null {
  const norm = ` ${normalizarDescricao(descricao)} `;
  const regra = [...ctx.regras]
    .sort((a, b) => b.padrao.length - a.padrao.length)
    .find((r) => r.padrao && norm.includes(` ${r.padrao} `));
  if (regra) return { categoria: regra.categoria, fonte: "regra" };
  const hist = ctx.historico.get(chaveEstabelecimento(descricao));
  if (hist) return { categoria: hist, fonte: "historico" };
  const padrao = categoriaPadrao(descricao);
  if (padrao) return { categoria: padrao, fonte: "padrao" };
  return null;
}

/** Semelhança simples entre descrições: compartilham a 1ª palavra relevante. */
export function descricoesParecidas(a: string, b: string): boolean {
  const ka = chaveEstabelecimento(a).split(" ")[0];
  const kb = chaveEstabelecimento(b).split(" ")[0];
  return !!ka && ka === kb;
}
