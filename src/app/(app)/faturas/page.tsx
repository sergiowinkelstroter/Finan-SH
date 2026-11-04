import { AtualizarParciaisSheet } from "@/components/atualizar-parciais-sheet";
import { FaturaRow } from "@/components/fatura-row";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import { escolha, um, type SearchParams } from "@/lib/search";
import { getFaturasDeMeses } from "@/server/faturas";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card as CardBase, CardHeader, CardTitle } from "@/components/ui/card";
import { addMesesCompetencia, competenciaLabelCurta } from "@/lib/dates";
import { FiltroLista } from "@/components/filtro-lista";

const PALETA_CARTOES = ["#6c4cf0", "#2e6be6", "#0ea88c", "#e2496b", "#f59e0b", "#06b6d4", "#8b5cf6", "#64748b"];

const STATUS = ["aberta", "fechada", "paga"] as const;

export default async function FaturasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  // Fatura é por competência: sempre um mês.
  const periodo = parsePeriodo({ mes: um(sp.mes) });
  const competencia = periodo.competencia;
  // Janela do gráfico: 5 meses para trás e 3 para frente do mês selecionado.
  const janela = Array.from({ length: 9 }, (_, i) => addMesesCompetencia(competencia, i - 5));
  const porMes = await getFaturasDeMeses(janela, { soAtivos: true });
  const todas = porMes.get(competencia) ?? [];
  const status = escolha(sp.status, STATUS);
  const faturas = status ? todas.filter((f) => (f.invoice?.status ?? "aberta") === status) : todas;

  const total = todas.reduce((s, f) => s + f.valorCents, 0);
  const pagas = todas.filter((f) => f.invoice?.status === "paga").reduce((s, f) => s + f.valorCents, 0);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">Faturas</h1>

      <div className="max-w-md">
        <SeletorPeriodo periodo={periodo} permitirIntervalo={false} />
      </div>

      {todas.length > 0 && (
        <>
          <Card>
            <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
              <Stat rotulo="Total do mês" valor={formatCents(total)} />
              <Stat rotulo="Já pago" valor={formatCents(pagas)} cor="text-menta" />
              <Stat rotulo="A pagar" valor={formatCents(total - pagas)} cor={total - pagas > 0 ? "text-rosa" : undefined} />
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-5">
            <CardBase className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Faturas por mês</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  series={todas.map((f, i) => ({ nome: f.card.nome, cor: PALETA_CARTOES[i % PALETA_CARTOES.length] }))}
                  dados={janela.map((c) => ({
                    label: competenciaLabelCurta(c),
                    valores: (porMes.get(c) ?? []).map((f) => f.valorCents),
                    destaque: c === competencia,
                  }))}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Meses futuros mostram só as parcelas já cadastradas (estimado).
                </p>
              </CardContent>
            </CardBase>
            <CardBase className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Divisão do mês por cartão</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  fatias={todas
                    .map((f, i) => ({ nome: f.card.nome, cents: f.valorCents, cor: PALETA_CARTOES[i % PALETA_CARTOES.length] }))
                    .filter((f) => f.cents > 0)
                    .sort((a, b) => b.cents - a.cents)}
                  centro={{ titulo: "Total", valor: formatCents(total) }}
                />
              </CardContent>
            </CardBase>
          </div>
          <FiltroLista
            campos={[
              {
                tipo: "select",
                chave: "status",
                label: "Situação",
                opcoes: [
                  { valor: "aberta", label: "Abertas" },
                  { valor: "fechada", label: "Fechadas" },
                  { valor: "paga", label: "Pagas" },
                ],
              },
            ]}
          />
        </>
      )}

      {todas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão ainda. Cadastre o primeiro em Cartões para começar a acompanhar.
        </p>
      ) : (
        <>
          <AtualizarParciaisSheet key={competencia} faturas={todas} competencia={competencia} />
          {faturas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma fatura com essa situação.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {faturas.map((f) => (
                <FaturaRow key={`${f.card.id}-${competencia}`} fatura={f} competencia={competencia} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span className={`font-mono text-sm font-semibold tabular ${cor ?? "text-tinta"}`}>{valor}</span>
    </div>
  );
}
