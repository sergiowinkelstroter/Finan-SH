import { AporteDeleteButton } from "@/components/aporte-delete-button";
import { AporteFormDialog } from "@/components/aporte-form-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { CardMetaReserva } from "@/components/card-meta-reserva";
import { SimuladorReserva } from "@/components/simulador-reserva";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo, periodoDoMes } from "@/lib/periodo";
import { um, type SearchParams } from "@/lib/search";
import { getEvolucaoReserva, getProgressoMeta, getReservaAtual, listarAportesDoPeriodo } from "@/server/reserva";
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

  const [reservaAtualCents, aportes, evolucao] = await Promise.all([
    getReservaAtual(),
    listarAportesDoPeriodo(periodo),
    getEvolucaoReserva(periodo),
  ]);
  const meta = await getProgressoMeta(reservaAtualCents);
  const entrou = aportes.filter((a) => a.valorCents > 0).reduce((s, a) => s + a.valorCents, 0);
  const saiu = aportes.filter((a) => a.valorCents < 0).reduce((s, a) => s + a.valorCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">Reserva</h1>
        <AporteFormDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col justify-center rounded-xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">Saldo atual</p>
          <p className="mt-1 font-display text-[44px] font-semibold leading-none tabular text-tinta">
            {formatCents(reservaAtualCents)}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Aportes no período</dt>
              <dd className="font-mono tabular text-menta">+{formatCents(entrou)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Resgates</dt>
              <dd className="font-mono tabular text-rosa">{formatCents(saiu)}</dd>
            </div>
          </dl>
        </section>

        <div className="lg:col-span-2">
          <CardMetaReserva progresso={meta} saldoCents={reservaAtualCents} />
        </div>
      </div>

      <div className="max-w-md">
        <SeletorPeriodo periodo={periodo} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
            <CardTitle>Aportes por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              series={[{ nome: "Aporte líquido", cor: "#6c4cf0" }]}
              dados={evolucao.map((e) => ({ label: e.label, valores: [Math.max(0, e.aportesCents)] }))}
            />
          </CardContent>
        </Card>
      </div>

      <SimuladorReserva saldoInicialCents={reservaAtualCents} />

      {aportes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento neste período. Registre um aporte para começar a acompanhar.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {aportes.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">
                    {a.descricao || (a.valorCents >= 0 ? "Aporte" : "Resgate")}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDataCurta(a.data)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-mono tabular ${a.valorCents >= 0 ? "text-menta" : "text-rosa"}`}>
                    {a.valorCents >= 0 ? "+" : ""}
                    {formatCents(a.valorCents)}
                  </span>
                  <AporteDeleteButton id={a.id} descricao={a.descricao || "lançamento"} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
