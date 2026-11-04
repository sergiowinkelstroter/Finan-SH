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
import { competenciaLabelCurta } from "@/lib/dates";
import { periodoAnterior, type Periodo } from "@/lib/periodo";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { entradasPorMes } from "./entradas";
import { montarFaturas, type FaturaEfetiva } from "./faturas";
import { parcelasNasCompetencias } from "./compras";
import { saidasNoPeriodo } from "./saidas";
import { tetosPorMes } from "./orcamento";
import { listarUsuarios } from "./usuarios";
import { invoices } from "@/db/schema";
import { inArray } from "drizzle-orm";

export interface LinhaMes {
  competencia: string;
  label: string;
  entradasCents: number;
  gastoCents: number;
  gastoCartoesCents: number;
  gastoSaidasCents: number;
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
}

export async function getAnalise(periodo: Periodo): Promise<Analise> {
  const comps = periodo.competencias;
  const [cartoes, invoicesRows, parcelas, saidas, entradasMapa, tetosMapa, usuarios] =
    await Promise.all([
      db.query.cards.findMany({
        where: eq(cards.ativo, true),
        orderBy: (c, { asc }) => [asc(c.nome)],
      }),
      db.select().from(invoices).where(inArray(invoices.competencia, comps)),
      parcelasNasCompetencias(comps),
      saidasNoPeriodo(periodo),
      entradasPorMes(comps),
      tetosPorMes(comps),
      listarUsuarios(),
    ]);

  const faturasPorMes = montarFaturas(cartoes, invoicesRows, parcelas, comps);

  const categorias = new Map<string, number>();
  const somar = (nome: string, cents: number) => {
    if (cents > 0) categorias.set(nome, (categorias.get(nome) ?? 0) + cents);
  };

  // ── Cartões: distribui o valor efetivo de cada fatura entre as categorias das parcelas
  const pagamentos: { userId: number; cents: number }[] = [];
  const porMesMap = new Map<string, LinhaMes>(
    comps.map((c) => [
      c,
      {
        competencia: c,
        label: competenciaLabelCurta(c),
        entradasCents: entradasMapa.get(c) ?? 0,
        gastoCents: 0,
        gastoCartoesCents: 0,
        gastoSaidasCents: 0,
        tetoCents: tetosMapa.get(c) ?? 0,
      },
    ]),
  );
  const tipos: TipoValor[] = [];

  for (const [competencia, lista] of faturasPorMes) {
    for (const f of lista) {
      tipos.push(f.tipo);
      porMesMap.get(competencia)!.gastoCartoesCents += f.valorCents;
      const doCartao = parcelas.filter(
        (p) => p.cardId === f.card.id && p.competencia === competencia,
      );
      const soma = doCartao.reduce((s, p) => s + p.valorCents, 0);
      const fator = soma > 0 ? Math.min(1, f.valorCents / soma) : 0;
      let alocado = 0;
      for (const p of doCartao) {
        const parte = Math.round(p.valorCents * fator);
        alocado += parte;
        somar(p.categoria ?? SEM_CATEGORIA, parte);
        if (p.compartilhada) {
          const pagador = f.card.titularId ?? p.compradorId;
          if (pagador) pagamentos.push({ userId: pagador, cents: parte });
        }
      }
      somar(CARTAO_SEM_CATEGORIA, f.valorCents - alocado);
    }
  }

  // ── Saídas avulsas
  for (const s of saidas) {
    somar(s.categoria ?? SEM_CATEGORIA, s.valorCents);
    const linha = porMesMap.get(`${s.data.slice(0, 7)}-01`);
    if (linha) linha.gastoSaidasCents += s.valorCents;
    if (s.compartilhada && s.pagoPor) pagamentos.push({ userId: s.pagoPor, cents: s.valorCents });
  }

  const porMes = [...porMesMap.values()].map((l) => ({
    ...l,
    gastoCents: l.gastoCartoesCents + l.gastoSaidasCents,
  }));
  const soma = (k: keyof LinhaMes) => porMes.reduce((s, l) => s + (l[k] as number), 0);
  const entradasCents = soma("entradasCents");
  const gastoCents = soma("gastoCents");
  const sobraCents = entradasCents - gastoCents;

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
