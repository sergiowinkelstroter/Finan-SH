import { AporteDeleteButton } from "@/components/aporte-delete-button";
import { AporteFormDialog } from "@/components/aporte-form-dialog";
import { AportePlanejadoForm } from "@/components/aporte-planejado-form";
import { PageHeader } from "@/components/page-header";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, IconBubble, ListCard, ListItem, SectionLabel } from "@/components/ds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { CardMetaReserva } from "@/components/card-meta-reserva";
import { SimuladorReserva } from "@/components/simulador-reserva";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { competenciaLabel, formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo, periodoDoMes } from "@/lib/periodo";
import { um, type SearchParams } from "@/lib/search";
import { getAportePlanejado, getEvolucaoReserva, getProgressoMeta, getReservaAtual, listarAportesDoPeriodo } from "@/server/reserva";
import { addMonths } from "date-fns";

export default async function ReservaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const temPeriodo = !!(sp.mes || sp.de);
  // Sem período explícito: mostra os últimos 12 meses no gráfico e na lista.
  const periodo = temPeriodo
    ? parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) })
    : parsePeriodo({
        de: periodoDoMes(addMonths(new Date(), -11)).de,
        ate: periodoDoMes(new Date()).ate,
      });

  const [reservaAtualCents, aportes, evolucao, aportePlanejadoCents] = await Promise.all([
    getReservaAtual(),
    listarAportesDoPeriodo(periodo),
    getEvolucaoReserva(periodo),
    getAportePlanejado(),
  ]);
  const meta = await getProgressoMeta(reservaAtualCents);
  const entrou = aportes.filter((a) => a.valorCents > 0).reduce((s, a) => s + a.valorCents, 0);
  const saiu = aportes.filter((a) => a.valorCents < 0).reduce((s, a) => s + a.valorCents, 0);

  const porMes: { competencia: string; itens: typeof aportes; total: number }[] = [];
  for (const a of aportes) {
    const comp = `${a.data.slice(0, 7)}-01`;
    const g = porMes[porMes.length - 1];
    if (g && g.competencia === comp) {
      g.itens.push(a);
      g.total += a.valorCents;
    } else porMes.push({ competencia: comp, itens: [a], total: a.valorCents });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={PiggyBank}
        titulo="Reserva"
        subtitulo="O que vocês guardam conta como saída do mês."
        acoes={<AporteFormDialog />}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <section className="bg-hero relative flex flex-col justify-between gap-6 overflow-hidden rounded-[28px] p-6 text-white lg:col-span-2">
          <div className="pointer-events-none absolute -right-14 -top-16 size-56 rounded-full bg-white/10 blur-2xl" aria-hidden />
          <div className="relative flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <PiggyBank className="size-5" />
            </span>
            <span className="text-sm text-white/80">Saldo da reserva</span>
          </div>
          <div className="relative">
            <p className="font-display text-[clamp(2rem,11vw,2.75rem)] font-semibold leading-none tabular">{formatCents(reservaAtualCents)}</p>
            {meta && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
                <Target className="size-4" /> meta de {formatCents(meta.metaCents)}
              </p>
            )}
          </div>
          <div className="relative grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
            <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
              <span className="flex items-center gap-1 text-[11px] text-white/75">
                <ArrowDownLeft className="size-3.5" /> Guardado no período
              </span>
              <span className="mt-0.5 block font-mono text-sm font-semibold tabular">+{formatCents(entrou)}</span>
            </div>
            <div className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
              <span className="flex items-center gap-1 text-[11px] text-white/75">
                <ArrowUpRight className="size-3.5" /> Resgates
              </span>
              <span className="mt-0.5 block font-mono text-sm font-semibold tabular">{formatCents(saiu)}</span>
            </div>
          </div>
        </section>

        <div className="lg:col-span-3">
          <CardMetaReserva progresso={meta} saldoCents={reservaAtualCents} />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1.5 p-4">
          <AportePlanejadoForm valorCents={aportePlanejadoCents} />
          <p className="text-xs text-muted-foreground">
            Meta mensal: entra como saída fixa na projeção e na planilha do futuro.
          </p>
        </CardContent>
      </Card>

      <div className="lg:max-w-md">
        <SeletorPeriodo periodo={periodo} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={evolucao.map((e) => e.label)}
              series={[
                { nome: "Saldo", cor: "#0ea88c", valores: evolucao.map((e) => e.saldoCents) },
                ...(meta
                  ? [{ nome: "Meta", cor: "#f59e0b", tracejada: true, valores: evolucao.map(() => meta.metaCents) }]
                  : []),
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guardado por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              series={[{ nome: "Aporte líquido", cor: "#6c4cf0" }]}
              dados={evolucao.map((e) => ({ label: e.label, valores: [Math.max(0, e.aportesCents)] }))}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-base font-semibold text-foreground">Movimentações</h2>
          {aportes.length === 0 ? (
            <EmptyState
              icon={PiggyBank}
              titulo="Nada guardado neste período"
              descricao="Registre um aporte para começar a acompanhar a reserva."
              acao={
                <AporteFormDialog
                  trigger={
                    <Button>
                      <Plus /> Guardar agora
                    </Button>
                  }
                />
              }
            />
          ) : (
            porMes.map((g) => (
              <div key={g.competencia} className="flex flex-col gap-2">
                <SectionLabel extra={`${g.total >= 0 ? "+" : ""}${formatCents(g.total)}`}>
                  {competenciaLabel(g.competencia)}
                </SectionLabel>
                <ListCard>
                  {g.itens.map((a) => {
                    const aporte = a.valorCents >= 0;
                    return (
                      <ListItem
                        key={a.id}
                        leading={
                          <IconBubble
                            icon={aporte ? ArrowDownLeft : ArrowUpRight}
                            cor={aporte ? "#0ea88c" : "#e2496b"}
                          />
                        }
                        titulo={a.descricao || (aporte ? "Aporte" : "Resgate")}
                        subtitulo={formatDataCurta(a.data)}
                        trailing={
                          <span className={`font-mono text-sm font-semibold tabular ${aporte ? "text-menta" : "text-rosa"}`}>
                            {aporte ? "+" : ""}
                            {formatCents(a.valorCents)}
                          </span>
                        }
                        acoes={<AporteDeleteButton id={a.id} descricao={a.descricao || "lançamento"} />}
                      />
                    );
                  })}
                </ListCard>
              </div>
            ))
          )}
        </section>

        <SimuladorReserva saldoInicialCents={reservaAtualCents} />
      </div>
    </div>
  );
}
