"use client";

import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";

type LinhaProjecao = {
  competencia: string;
  label: string;
  labelCurto: string;
  comprometidoCents: number;
  recorrentesCents: number;
  saidasVariaveisCents: number;
  entradasCents: number;
  tetoCents: number;
  saldoProjetadoCents: number;
  saldoAcumuladoCents: number;
  atual: boolean;
};

type Estimativa = {
  chave: string;
  categoria: string | null;
  label: string;
  mediaMensalCents: number;
  atualCents: number;
};

type ValorEstimativa = { valor: string; incluir: boolean };

export function ProjecaoInterativa({
  linhas: linhasBase,
  estimativas,
  proporcaoRestanteMesAtual,
  horizonte,
}: {
  linhas: LinhaProjecao[];
  estimativas: Estimativa[];
  proporcaoRestanteMesAtual: number;
  horizonte: string;
}) {
  const [valores, setValores] = useState<Record<string, ValorEstimativa>>(() =>
    Object.fromEntries(estimativas.map((e) => [e.chave, { valor: formatCentsSemSimbolo(e.mediaMensalCents), incluir: true }])),
  );

  const linhas = useMemo(() => {
    let acumulado = 0;
    return linhasBase.map((linha, indice) => {
      const variaveisCents = estimativas.reduce((total, estimativa) => {
        const estado = valores[estimativa.chave];
        if (!estado?.incluir) return total + (indice === 0 ? estimativa.atualCents : 0);
        const mensal = parseReaisParaCents(estado?.valor ?? "0");
        return total + (indice === 0
          ? estimativa.atualCents + Math.round(mensal * proporcaoRestanteMesAtual)
          : mensal);
      }, 0);
      const saldoProjetadoCents = linha.saldoProjetadoCents + linha.saidasVariaveisCents - variaveisCents;
      acumulado += saldoProjetadoCents;
      return { ...linha, saidasVariaveisCents: variaveisCents, saldoProjetadoCents, saldoAcumuladoCents: acumulado };
    });
  }, [estimativas, linhasBase, proporcaoRestanteMesAtual, valores]);

  const totalEntradasCents = linhas.reduce((s, l) => s + l.entradasCents, 0);
  const totalComprometidoCents = linhas.reduce((s, l) => s + l.comprometidoCents + l.recorrentesCents + l.saidasVariaveisCents, 0);
  const piorMes = linhas.reduce((pior, linha) => !pior || linha.saldoProjetadoCents < pior.saldoProjetadoCents ? linha : pior, linhas[0]);
  const mesesNegativos = linhas.filter((l) => l.saldoProjetadoCents < 0).length;
  const saldoFinal = linhas[linhas.length - 1]?.saldoAcumuladoCents ?? 0;

  function atualizar(chave: string, parcial: Partial<ValorEstimativa>) {
    setValores((atual) => ({
      ...atual,
      [chave]: { ...atual[chave], ...parcial },
    }));
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Estimativa de saídas variáveis</CardTitle>
          <p className="text-sm text-muted-foreground">
            Média por categoria dos três últimos meses completos. Ajuste o valor mensal ou desmarque para ignorar a previsão.
            No mês atual, os lançamentos já registrados continuam incluídos.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {estimativas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há saídas avulsas recentes para estimar.</p>
          ) : estimativas.map((e) => {
            const estado = valores[e.chave] ?? { valor: "0,00", incluir: true };
            return (
              <div key={e.chave} className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3">
                <label className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={estado.incluir}
                    onChange={(event) => atualizar(e.chave, { incluir: event.target.checked })}
                    className="size-4 accent-violeta"
                    aria-label={`Incluir previsão de ${e.label}`}
                  />
                  <span className="truncate">{e.label}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">média {formatCents(e.mediaMensalCents)}</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={estado.valor}
                    onChange={(event) => atualizar(e.chave, { valor: event.target.value })}
                    disabled={!estado.incluir}
                    aria-label={`Estimativa mensal para ${e.label}`}
                    className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-2 text-right font-mono text-sm tabular text-foreground disabled:opacity-50"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo icon={TrendingUp} titulo="Entradas previstas" valor={formatCents(totalEntradasCents)} />
        <Resumo icon={Wallet} titulo="Compromissos e saídas estimadas" valor={formatCents(totalComprometidoCents)} />
        <Resumo icon={saldoFinal < 0 ? TrendingDown : TrendingUp} titulo={`Saldo em ${horizonte} meses`} valor={formatCents(saldoFinal)} cor={saldoFinal < 0 ? "text-rosa" : "text-menta"} />
        <Resumo icon={TrendingDown} titulo="Mês mais apertado" valor={piorMes?.label ?? "—"} detalhe={piorMes ? formatCents(piorMes.saldoProjetadoCents) : undefined} cor={piorMes && piorMes.saldoProjetadoCents < 0 ? "text-rosa" : undefined} capitalize />
      </div>

      {mesesNegativos > 0 && (
        <p className="rounded-xl border border-rosa/40 bg-rosa/10 p-3 text-sm text-rosa">
          Atenção: em {mesesNegativos} {mesesNegativos === 1 ? "mês" : "meses"} os compromissos e gastos estimados superam as entradas.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Entradas × compromissos</CardTitle></CardHeader>
          <CardContent>
            <BarChart
              series={[
                { nome: "Entradas", cor: "#0ea88c" },
                { nome: "Parcelas", cor: "#6c4cf0" },
                { nome: "Recorrentes", cor: "#2e6be6" },
                { nome: "Saídas variáveis", cor: "#e2496b" },
              ]}
              dados={linhas.map((l) => ({ label: l.labelCurto, valores: [l.entradasCents, l.comprometidoCents, l.recorrentesCents, l.saidasVariaveisCents], destaque: l.atual }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Saldo acumulado</CardTitle></CardHeader>
          <CardContent>
            <LineChart
              labels={linhas.map((l) => l.labelCurto)}
              series={[
                { nome: "Saldo acumulado", cor: "#6c4cf0", valores: linhas.map((l) => l.saldoAcumuladoCents) },
                { nome: "Saldo do mês", cor: "#2e6be6", tracejada: true, valores: linhas.map((l) => l.saldoProjetadoCents) },
              ]}
            />
            <p className="mt-2 text-xs text-muted-foreground">Saldo = entradas − parcelas − recorrências − saídas variáveis estimadas.</p>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Mês a mês</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {linhas.map((l) => {
            const comprometido = l.comprometidoCents + l.recorrentesCents + l.saidasVariaveisCents;
            const percentual = l.entradasCents > 0 ? comprometido / l.entradasCents : 1;
            return (
              <Card key={l.competencia} className={l.atual ? "border-violeta/50" : undefined}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-base font-semibold capitalize text-foreground">{l.label}{l.atual && <span className="ml-2 text-xs font-normal text-violeta">atual</span>}</span>
                    <span className={`font-mono text-base font-semibold tabular ${l.saldoProjetadoCents < 0 ? "text-rosa" : "text-menta"}`}>{formatCents(l.saldoProjetadoCents)}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                    <Item rotulo="Entradas" valor={formatCents(l.entradasCents)} />
                    <Item rotulo="Parcelas" valor={`~${formatCents(l.comprometidoCents)}`} />
                    <Item rotulo="Recorrentes" valor={formatCents(l.recorrentesCents)} />
                    <Item rotulo="Saídas variáveis" valor={`~${formatCents(l.saidasVariaveisCents)}`} />
                  </dl>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className={`h-full rounded-full ${l.saldoProjetadoCents < 0 ? "bg-rosa" : "bg-violeta"}`} style={{ width: `${Math.min(100, percentual * 100)}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{l.entradasCents > 0 ? `${Math.round(percentual * 100)}% das entradas comprometidas ou estimadas` : "Sem entradas previstas"}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Resumo({ icon: Icon, titulo, valor, detalhe, cor, capitalize }: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  valor: string;
  detalhe?: string;
  cor?: string;
  capitalize?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" /> {titulo}</span>
        <span className={`font-mono text-base font-semibold tabular lg:text-lg ${capitalize ? "capitalize" : ""} ${cor ?? "text-tinta"}`}>{valor}</span>
        {detalhe && <span className={`font-mono text-xs tabular ${cor ?? "text-muted-foreground"}`}>{detalhe}</span>}
      </CardContent>
    </Card>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <div className="flex items-baseline justify-between gap-2"><dt className="text-muted-foreground">{rotulo}</dt><dd className="font-mono tabular text-tinta">{valor}</dd></div>;
}
