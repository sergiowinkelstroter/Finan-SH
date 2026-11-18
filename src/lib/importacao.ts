/**
 * Leitura de extratos/faturas exportados pelos bancos (CSV e OFX).
 * Funções puras — rodam no navegador (prévia) e no servidor.
 */

export interface LinhaExtrato {
  /** Posição no arquivo (estável para a revisão). */
  idx: number;
  data: string; // yyyy-MM-dd
  descricao: string;
  /** Valor com o sinal do arquivo, em centavos. */
  valorBrutoCents: number;
  /** Id da transação no OFX (FITID), quando houver. */
  fitid?: string;
  /** "Parcela 3/10" detectada na descrição. */
  parcela?: { n: number; total: number };
}

export interface ResultadoLeitura {
  formato: "ofx" | "csv";
  linhas: LinhaExtrato[];
  avisos: string[];
}

/** Decodifica o arquivo tentando UTF-8 e caindo para Windows-1252 (comum em bancos). */
export function decodificarArquivo(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("windows-1252").decode(buffer);
}

export function lerExtrato(texto: string): ResultadoLeitura {
  const t = texto.replace(/^﻿/, "");
  if (/<OFX>|<STMTTRN>|OFXHEADER/i.test(t)) return lerOFX(t);
  return lerCSV(t);
}

// ───────────────────────── OFX

function lerOFX(texto: string): ResultadoLeitura {
  const linhas: LinhaExtrato[] = [];
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  const tag = (bloco: string, nome: string) => {
    const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, "i"));
    return m?.[1].trim() ?? "";
  };
  blocos.forEach((bloco, i) => {
    const dt = tag(bloco, "DTPOSTED");
    const valor = parseValor(tag(bloco, "TRNAMT"));
    const descricao = limparDescricao(tag(bloco, "MEMO") || tag(bloco, "NAME"));
    if (dt.length < 8 || valor == null || !descricao) return;
    linhas.push({
      idx: i,
      data: `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`,
      descricao,
      valorBrutoCents: valor,
      fitid: tag(bloco, "FITID") || undefined,
      parcela: detectarParcela(descricao),
    });
  });
  return { formato: "ofx", linhas, avisos: linhas.length ? [] : ["Nenhuma transação encontrada no OFX."] };
}

// ───────────────────────── CSV

const COLUNA_DATA = /^(data|date|dt)(\b|_| )|data lan|data da compra|data mov/i;
const COLUNA_DESC = /descri|title|t[ií]tulo|estabelecimento|hist[oó]rico|lan[cç]amento|memo|nome/i;
const COLUNA_VALOR = /^(valor|amount|value|vlr)|valor \(r\$\)|valor em r\$|quantia/i;

function lerCSV(texto: string): ResultadoLeitura {
  const avisos: string[] = [];
  const brutas = texto.split(/\r?\n/).filter((l) => l.trim());
  if (brutas.length === 0) return { formato: "csv", linhas: [], avisos: ["Arquivo vazio."] };

  const sep = detectarSeparador(brutas.slice(0, 10));
  const tabela = brutas.map((l) => dividirCSV(l, sep));

  // Cabeçalho: primeira linha (até a 15ª) que tenha colunas de data, descrição e valor.
  let cab = -1;
  let iData = -1;
  let iDesc = -1;
  let iValor = -1;
  for (let r = 0; r < Math.min(15, tabela.length); r++) {
    const cols = tabela[r].map((c) => c.trim());
    const d = cols.findIndex((c) => COLUNA_DATA.test(c));
    const v = cols.findIndex((c) => COLUNA_VALOR.test(c));
    const s = cols.findIndex((c, i) => i !== d && i !== v && COLUNA_DESC.test(c));
    if (d >= 0 && v >= 0 && s >= 0) {
      cab = r;
      iData = d;
      iDesc = s;
      iValor = v;
      break;
    }
  }

  // Sem cabeçalho reconhecível: deduz pelas colunas da primeira linha de dados.
  if (cab < 0) {
    const amostra = tabela.find((cols) => cols.some((c) => parseData(c)));
    if (amostra) {
      iData = amostra.findIndex((c) => parseData(c));
      iValor = amostra.findIndex((c, i) => i !== iData && parseValor(c) != null && /\d[.,]\d{2}$/.test(c.trim()));
      iDesc = amostra.findIndex((c, i) => i !== iData && i !== iValor && /[a-z]/i.test(c));
      avisos.push("Cabeçalho não reconhecido — colunas deduzidas automaticamente. Confira a prévia.");
    }
  }
  if (iData < 0 || iDesc < 0 || iValor < 0) {
    return { formato: "csv", linhas: [], avisos: ["Não encontrei as colunas de data, descrição e valor neste CSV."] };
  }

  const linhas: LinhaExtrato[] = [];
  tabela.slice(cab + 1).forEach((cols, i) => {
    const data = parseData(cols[iData] ?? "");
    const valor = parseValor(cols[iValor] ?? "");
    const descricao = limparDescricao(cols[iDesc] ?? "");
    if (!data || valor == null || valor === 0 || !descricao) return;
    linhas.push({ idx: i, data, descricao, valorBrutoCents: valor, parcela: detectarParcela(descricao) });
  });
  if (linhas.length === 0) avisos.push("Nenhuma linha válida encontrada.");
  return { formato: "csv", linhas, avisos };
}

function detectarSeparador(amostra: string[]): string {
  const conta = (s: string) => amostra.reduce((n, l) => n + (l.split(s).length - 1), 0);
  return [";", ",", "\t"].sort((a, b) => conta(b) - conta(a))[0];
}

function dividirCSV(linha: string, sep: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else aspas = !aspas;
    } else if (c === sep && !aspas) {
      out.push(atual);
      atual = "";
    } else atual += c;
  }
  out.push(atual);
  return out.map((c) => c.trim());
}

// ───────────────────────── campos

export function parseData(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
    const mes = Number(m[2]);
    const dia = Number(m[1]);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }
  return null;
}

/** "1.234,56" | "-1234.56" | "R$ 12,30" | "(12,30)" → centavos com sinal. */
export function parseValor(v: string): number | null {
  let s = v.trim().replace(/\s|R\$/g, "");
  if (!s) return null;
  let negativo = false;
  if (/^\(.*\)$/.test(s)) {
    negativo = true;
    s = s.slice(1, -1);
  }
  if (s.endsWith("-")) {
    negativo = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith("-")) {
    negativo = !negativo;
    s = s.slice(1);
  } else if (s.startsWith("+")) s = s.slice(1);
  if (!/^[\d.,]+$/.test(s)) return null;
  const ultVirg = s.lastIndexOf(",");
  const ultPonto = s.lastIndexOf(".");
  if (ultVirg > ultPonto) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return negativo ? -cents : cents;
}

export function limparDescricao(v: string): string {
  return v.replace(/\s+/g, " ").replace(/^"|"$/g, "").trim();
}

/** "Parcela 3/10", "3 de 10", "LOJA 03/10" → { n: 3, total: 10 }. */
export function detectarParcela(descricao: string): { n: number; total: number } | undefined {
  const m =
    descricao.match(/parc(?:ela)?\.?\s*(\d{1,2})\s*(?:\/|de)\s*(\d{1,2})/i) ??
    descricao.match(/(?:^|\s|-)(\d{1,2})\s*\/\s*(\d{1,2})\s*$/) ??
    descricao.match(/(?:^|\s)(\d{1,2})\s+de\s+(\d{1,2})\s*$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const total = Number(m[2]);
  if (total < 2 || total > 48 || n < 1 || n > total) return undefined;
  return { n, total };
}

/**
 * Decide qual sinal é "gasto": na fatura do cartão as compras costumam vir
 * positivas; no extrato da conta, negativas. Usa a maioria das linhas.
 */
export function sinalDosGastos(linhas: LinhaExtrato[]): 1 | -1 {
  const pos = linhas.filter((l) => l.valorBrutoCents > 0).length;
  return pos >= linhas.length - pos ? 1 : -1;
}
