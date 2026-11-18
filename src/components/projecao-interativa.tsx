"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, ShoppingBag, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { CategoriaIcone } from "@/components/categoria-icone";
import { IconBubble, StatCard } from "@/components/ds";
import { cn } from "@/lib/utils";
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
  reservaCents: number;
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
    const ajustadas = linhasBase.map((linha, indice) => {
      const variaveisCents = estimativas.reduce((total, estimativa) => {
        const estado = valores[estimativa.chave];
        if (!estado?.incluir) return total + (indice === 0 ? estimativa.atualCents : 0);
        const mensal = parseReaisParaCents(estado?.valor ?? "0");
        return total + (indice === 0
          ? estimativa.atualCents + Math.round(mensal * proporcaoRestanteMesAtual)
          : mensal);
      }, 0);
      const saldoProjetadoCents = linha.saldoProjetadoCents + linha.saidasVariaveisCents - variaveisCents;
      return { ...linha, saidasVariaveisCents: variaveisCents, saldoProjetadoCents };
    });
    return ajustadas.map((linha, indice) => ({
      ...linha,
      saldoAcumuladoCents: ajustadas
        .slice(0, indice + 1)
        .reduce((total, anterior) => total + anterior.saldoProjetadoCents, 0),
    }));
  }, [estimativas, linhasBase, proporcaoRestanteMesAtual, valores]);

  const totalEntradasCents = linhas.reduce((s, l) => s + l.entradasCents, 0);
  const totalComprometidoCents = linhas.reduce((s, l) => s + l.comprometidoCents + l.recorrentesCents + l.saidasVariaveisCents + l.reservaCents, 0);
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
        <CardHeader className="flex-row items-start gap-3">
          <IconBubble icon={ShoppingBag} cor="#f59e0b" size="sm" />
          <div>
            <CardTitle>Estimativa de gastos variáveis</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Média por categoria dos últimos meses completos (até 3), somando saídas avulsas e compras à vista no cartão. Ajuste o valor mensal ou desmarque para ignorar.
              No mês atual, os lançamentos já registrados continuam incluídos.
            </p>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {estimativas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há saídas avulsas recentes para estimar.</p>
          ) : estimativas.map((e) => {
            const estado = valores[e.chave] ?? { valor: "0,00", incluir: true };
            return (
              <div
                key={e.chave}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_128px] items-center gap-3 rounded-2xl px-2 py-2 transition-opacity",
                  !estado.incluir && "opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={estado.incluir}
                  onChange={(event) => atualizar(e.chave, { incluir: event.target.checked })}
                  className="size-4 accent-violeta"
                  aria-label={`Incluir previsão de ${e.label}`}
                />
                <label className="flex min-w-0 items-center gap-3">
                  <CategoriaIcone nome={e.categoria ?? e.label} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{e.label}</span>
                    <span className="text-xs text-muted-foreground">média {formatCents(e.mediaMensalCents)}</span>
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={estado.valor}
                    onChange={(event) => atualizar(e.chave, { valor: event.target.value })}
                    disabled={!estado.incluir}
                    aria-label={`Estimativa mensal para ${e.label}`}
                    className="h-10 w-full rounded-xl border border-input bg-card pl-8 pr-3 text-right font-mono text-sm tabular text-foreground disabled:opacity-50"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={TrendingUp} cor="#0ea88c" titulo="Entradas previstas" valor={formatCents(totalEntradasCents)} />
        <StatCard icon={Wallet} cor="#6c4cf0" titulo="Compromissos, gastos e reserva" valor={formatCents(totalComprometidoCents)} />
        <StatCard
          icon={saldoFinal < 0 ? TrendingDown : TrendingUp}
          cor={saldoFinal < 0 ? "#e2496b" : "#0ea88c"}
          titulo={`Saldo em ${horizonte} meses`}
          valor={formatCents(saldoFinal)}
          tom={saldoFinal < 0 ? "negativo" : "positivo"}
        />
        <StatCard
          icon={CalendarClock}
          cor="#f59e0b"
          titulo="Mês mais apertado"
          valor={<span className="capitalize">{piorMes?.label ?? "—"}</span>}
          detalhe={piorMes ? formatCents(piorMes.saldoProjetadoCents) : undefined}
          tom={piorMes && piorMes.saldoProjetadoCents < 0 ? "negativo" : undefined}
        />
      </div>

      {mesesNegativos > 0 && (
        <p className="flex items-center gap-3 rounded-2xl bg-rosa/10 p-3 text-sm font-medium text-rosa">
          <AlertTriangle className="size-5 shrink-0" />
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
                { nome: "Faturas", cor: "#6c4cf0" },
                { nome: "Recorrentes", cor: "#2e6be6" },
                { nome: "Saídas variáveis", cor: "#e2496b" },
                { nome: "Reserva", cor: "#10b981" },
              ]}
              dados={linhas.map((l) => ({ label: l.labelCurto, valores: [l.entradasCents, l.comprometidoCents, l.recorrentesCents, l.saidasVariaveisCents, l.reservaCents], destaque: l.atual }))}
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
            <p className="mt-2 text-xs text-muted-foreground">Saldo = entradas − faturas − recorrências − saídas variáveis estimadas − reserva.</p>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold text-foreground">Mês a mês</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {linhas.map((l) => {
            const comprometido = l.comprometidoCents + l.recorrentesCents + l.saidasVariaveisCents + l.reservaCents;
            const percentual = l.entradasCents > 0 ? comprometido / l.entradasCents : 1;
            const negativo = l.saldoProjetadoCents < 0;
            return (
              <Card key={l.competencia} className={cn("flex flex-col gap-4 p-4", l.atual && "ring-2 ring-violeta/40")}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold capitalize text-foreground">{l.label}</p>
                    {l.atual && (
                      <span className="mt-0.5 inline-flex rounded-full bg-violeta/10 px-2 py-0.5 text-[11px] font-semibold text-violeta">
                        mês atual
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">{negativo ? "falta" : "sobra"}</p>
                    <p className={cn("font-mono text-base font-semibold tabular", negativo ? "text-rosa" : "text-menta")}>
                      {formatCents(l.saldoProjetadoCents)}
                    </p>
                  </div>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  {[
                    [l.comprometidoCents, "#6c4cf0"],
                    [l.recorrentesCents, "#2e6be6"],
                    [l.saidasVariaveisCents, "#e2496b"],
                    [l.reservaCents, "#10b981"],
                  ].map(([v, cor]) => (
                    <div
                      key={cor as string}
                      className="h-full border-r border-card last:border-r-0"
                      style={{ width: `${Math.min(100, ((v as number) / Math.max(l.entradasCents, comprometido, 1)) * 100)}%`, background: cor as string }}
                    />
                  ))}
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <Item cor="#0ea88c" rotulo="Entradas" valor={formatCents(l.entradasCents)} />
                  <Item cor="#6c4cf0" rotulo="Faturas" valor={`~${formatCents(l.comprometidoCents)}`} />
                  <Item cor="#2e6be6" rotulo="Recorrentes" valor={formatCents(l.recorrentesCents)} />
                  <Item cor="#e2496b" rotulo="Variáveis" valor={`~${formatCents(l.saidasVariaveisCents)}`} />
                  <Item cor="#10b981" rotulo="Reserva" valor={formatCents(l.reservaCents)} />
                </dl>
                <p className="text-xs text-muted-foreground">
                  {l.entradasCents > 0 ? `${Math.round(percentual * 100)}% das entradas comprometidas ou estimadas` : "Sem entradas previstas"}
                </p>
              </Card>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Item({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: cor }} />
        {rotulo}
      </dt>
      <dd className="font-mono tabular text-tinta">{valor}</dd>
    </div>
  );
}
