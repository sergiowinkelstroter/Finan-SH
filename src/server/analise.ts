import "server-only";

import { format, parseISO } from "date-fns";
import {
  calcularAcerto,
  tipoMenosConfiavel,
  variacao,
  type Acerto,
  type TipoValor,
} from "@/lib/calculos";
import { CARTAO_SEM_CATEGORIA, SEM_CATEGORIA, corCategoria } from "@/lib/categorias";
import { competenciaLabelCurta, ehPrevisto, hojeISO } from "@/lib/dates";
import { fracaoDoMes, periodoAnterior, type Periodo } from "@/lib/periodo";
import { db } from "@/db";
import { entradasPorMes } from "./entradas";
import { montarFaturas, type FaturaEfetiva } from "./faturas";
import { parcelasNasCompetencias } from "./compras";
import { saidasNoPeriodo } from "./saidas";
import { tetosPorMes } from "./orcamento";
import { listarUsuarios } from "./usuarios";
import { listarAportesDoPeriodo } from "./reserva";
import { invoices } from "@/db/schema";
import { inArray } from "drizzle-orm";

export interface LinhaMes {
  competencia: string;
  label: string;
  entradasCents: number;
  gastoCents: number;
  gastoCartoesCents: number;
  gastoSaidasCents: number;
  /** Aportes líquidos na reserva no mês — tratados como saída do mês. */
  reservaCents: number;
  tetoCents: number;
}

export interface FatiaCategoria {
  nome: string;
  cents: number;
  cor: string;
}

export interface Analise {
  periodo: Periodo;
  entradasCents: number;
  tetoCents: number;
  gastoCents: number;
  gastoCartoesCents: number;
  gastoSaidasCents: number;
  gastoTipo: TipoValor;
  sobraCents: number;
  /** Aportes líquidos na reserva no período (saída "para guardar"). */
  reservaCents: number;
  /** Entradas − gastos − reserva: o que sobrou solto. */
  livreCents: number;
  /**
   * Quanto as faturas fechadas vieram abaixo das compras lançadas (estornos,
   * créditos, descontos). As categorias somam o valor cheio; isto desconta.
   */
  creditosCartaoCents: number;
  /** Gasto por categoria separado por origem (cartão × saída avulsa). */
  porCategoriaOrigem: { nome: string; cor: string; cartaoCents: number; saidasCents: number }[];
  /** sobra / entradas (null sem entradas). */
  taxaPoupanca: number | null;
  porMes: LinhaMes[];
  porCategoria: FatiaCategoria[];
  faturasPorMes: Map<string, FaturaEfetiva[]>;
  maioresSaidas: Awaited<ReturnType<typeof saidasNoPeriodo>>;
  ultimasSaidas: Awaited<ReturnType<typeof saidasNoPeriodo>>;
  acerto: Acerto;
  usuarios: { id: number; nome: string }[];
  qtdSaidas: number;
  /** Contas fixas e saídas com data futura dentro do período: ainda não contam como gasto. */
  previstoCents: number;
  qtdPrevistas: number;
}

export async function getAnalise(periodo: Periodo): Promise<Analise> {
  const comps = periodo.competencias;
  const [cartoes, invoicesRows, parcelas, todasSaidas, entradasMapa, tetosMapa, usuarios, aportes] =
    await Promise.all([
      // Todos os cartões: arquivados contam nos meses em que ainda têm parcela/fatura.
      db.query.cards.findMany({ orderBy: (c, { asc }) => [asc(c.nome)] }),
      db.select().from(invoices).where(inArray(invoices.competencia, comps)),
      parcelasNasCompetencias(comps),
      saidasNoPeriodo(periodo),
      entradasPorMes(comps),
      tetosPorMes(comps),
      listarUsuarios(),
      listarAportesDoPeriodo(periodo),
    ]);

  // Só conta o que já aconteceu; o resto do período fica como "previsto".
  const hoje = hojeISO();
  const previstas = todasSaidas.filter((x) => ehPrevisto(x, hoje));
  const saidas = todasSaidas.filter((x) => !ehPrevisto(x, hoje));

  const faturasPorMes = montarFaturas(cartoes, invoicesRows, parcelas, comps);

  const categorias = new Map<string, number>();
  const origem = new Map<string, { cartaoCents: number; saidasCents: number }>();
  const somar = (nome: string, cents: number, de: "cartao" | "saidas" = "cartao") => {
    if (cents <= 0) return;
    categorias.set(nome, (categorias.get(nome) ?? 0) + cents);
    const o = origem.get(nome) ?? { cartaoCents: 0, saidasCents: 0 };
    if (de === "cartao") o.cartaoCents += cents;
    else o.saidasCents += cents;
    origem.set(nome, o);
  };

  // ── Cartões: distribui o valor efetivo de cada fatura entre as categorias das parcelas
  const pagamentos: { userId: number; cents: number }[] = [];
  const porMesMap = new Map<string, LinhaMes>(
    comps.map((c) => [
      c,
      {
        competencia: c,
        label: competenciaLabelCurta(c),
        entradasCents: Math.round((entradasMapa.get(c) ?? 0) * fracaoDoMes(periodo, c)),
        gastoCents: 0,
        gastoCartoesCents: 0,
        gastoSaidasCents: 0,
        reservaCents: 0,
        tetoCents: Math.round((tetosMapa.get(c) ?? 0) * fracaoDoMes(periodo, c)),
      },
    ]),
  );
  const tipos: TipoValor[] = [];
  let creditosCartaoCents = 0;

  for (const [competencia, lista] of faturasPorMes) {
    // Intervalo parcial: a fatura do mês entra pela fração de dias do período.
    const fr = fracaoDoMes(periodo, competencia);
    const r = (v: number) => Math.round(v * fr);
    for (const f of lista) {
      tipos.push(f.tipo);
      porMesMap.get(competencia)!.gastoCartoesCents += r(f.valorCents);
      const doCartao = parcelas.filter(
        (p) => p.cardId === f.card.id && p.competencia === competencia,
      );
      const soma = doCartao.reduce((s, p) => s + p.valorCents, 0);
      // Categorias sempre pelo valor real das compras (bate com a tela da categoria).
      // A diferença para o valor da fatura fica explícita: a mais → "Cartão (outros)";
      // a menos (estorno, crédito, desconto) → créditos do cartão.
      const fator = soma > 0 ? Math.min(1, f.valorCents / soma) : 0;
      for (const p of doCartao) {
        somar(p.categoria ?? SEM_CATEGORIA, r(p.valorCents));
        if (p.compartilhada) {
          const pagador = f.card.titularId ?? p.compradorId;
          // No acerto vale o que foi efetivamente pago na fatura.
          if (pagador) pagamentos.push({ userId: pagador, cents: r(p.valorCents * fator) });
        }
      }
      if (f.valorCents > soma) {
        somar(CARTAO_SEM_CATEGORIA, r(f.valorCents - soma));
        // Parte da fatura sem compra lançada: quem paga é o titular do cartão.
        if (f.card.titularId) pagamentos.push({ userId: f.card.titularId, cents: r(f.valorCents - soma) });
      } else creditosCartaoCents += r(soma - f.valorCents);
    }
  }

  // ── Saídas avulsas
  for (const s of saidas) {
    somar(s.categoria ?? SEM_CATEGORIA, s.valorCents, "saidas");
    const linha = porMesMap.get(`${s.data.slice(0, 7)}-01`);
    if (linha) linha.gastoSaidasCents += s.valorCents;
    if (s.compartilhada && s.pagoPor) pagamentos.push({ userId: s.pagoPor, cents: s.valorCents });
  }

  // ── Reserva: aporte é dinheiro que sai do mês (resgate devolve)
  for (const a of aportes) {
    const linha = porMesMap.get(`${a.data.slice(0, 7)}-01`);
    if (linha) linha.reservaCents += a.valorCents;
  }

  const porMes = [...porMesMap.values()].map((l) => ({
    ...l,
    gastoCents: l.gastoCartoesCents + l.gastoSaidasCents,
  }));
  const soma = (k: keyof LinhaMes) => porMes.reduce((s, l) => s + (l[k] as number), 0);
  const entradasCents = soma("entradasCents");
  const gastoCents = soma("gastoCents");
  const sobraCents = entradasCents - gastoCents;
  const reservaCents = soma("reservaCents");

  const porCategoria = [...categorias.entries()]
    .map(([nome, cents]) => ({ nome, cents, cor: corCategoria(nome) }))
    .sort((a, b) => b.cents - a.cents);

  const ordenadasPorValor = [...saidas].sort((a, b) => b.valorCents - a.valorCents);
  const ordenadasPorData = [...saidas].sort((a, b) =>
    a.data === b.data ? b.id - a.id : b.data.localeCompare(a.data),
  );

  return {
    periodo,
    entradasCents,
    tetoCents: soma("tetoCents"),
    gastoCents,
    gastoCartoesCents: soma("gastoCartoesCents"),
    gastoSaidasCents: soma("gastoSaidasCents"),
    gastoTipo: tipoMenosConfiavel(tipos),
    sobraCents,
    reservaCents,
    livreCents: sobraCents - reservaCents,
    creditosCartaoCents,
    porCategoriaOrigem: [...origem.entries()]
      .map(([nome, o]) => ({ nome, cor: corCategoria(nome), ...o }))
      .sort((a, b) => b.cartaoCents + b.saidasCents - (a.cartaoCents + a.saidasCents)),
    taxaPoupanca: entradasCents > 0 ? sobraCents / entradasCents : null,
    porMes,
    porCategoria,
    faturasPorMes,
    maioresSaidas: ordenadasPorValor.slice(0, 5),
    ultimasSaidas: ordenadasPorData.slice(0, 5),
    acerto: calcularAcerto(
      pagamentos,
      usuarios.map((u) => u.id),
    ),
    usuarios: usuarios.map((u) => ({ id: u.id, nome: u.nome })),
    qtdSaidas: saidas.length,
    previstoCents: previstas.reduce((t, x) => t + x.valorCents, 0),
    qtdPrevistas: previstas.length,
  };
}

export interface AnaliseComparada {
  atual: Analise;
  anterior: Analise;
  deltaGasto: number | null;
  deltaEntradas: number | null;
  categoriasAnterior: Map<string, number>;
}

export async function getAnaliseComparada(periodo: Periodo): Promise<AnaliseComparada> {
  const [atual, anterior] = await Promise.all([
    getAnalise(periodo),
    getAnalise(periodoAnterior(periodo)),
  ]);
  return {
    atual,
    anterior,
    deltaGasto: variacao(atual.gastoCents, anterior.gastoCents),
    deltaEntradas: variacao(atual.entradasCents, anterior.entradasCents),
    categoriasAnterior: new Map(anterior.porCategoria.map((c) => [c.nome, c.cents])),
  };
}

/** yyyy-MM-dd → "dd/MM" */
export function diaMes(iso: string) {
  return format(parseISO(iso), "dd/MM");
}
