import { AtualizarParciaisSheet } from "@/components/atualizar-parciais-sheet";
import { FaturaRow } from "@/components/fatura-row";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import { escolha, um, type SearchParams } from "@/lib/search";
import { getFaturasDeMeses } from "@/server/faturas";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { Card as CardBase, CardHeader, CardTitle } from "@/components/ui/card";
import { addMesesCompetencia, competenciaLabelCurta } from "@/lib/dates";
import { FiltroLista } from "@/components/filtro-lista";
import { CheckCircle2, CreditCard, Hourglass, Receipt } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionLabel, StatCard } from "@/components/ds";

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
      <PageHeader icon={CreditCard} titulo="Faturas" subtitulo="Acompanhe, feche e pague as faturas de cada cartão." />

      {todas.length === 0 ? (
        <>
          <div className="lg:max-w-md">
            <SeletorPeriodo periodo={periodo} permitirIntervalo={false} />
          </div>
          <EmptyState
            icon={CreditCard}
            titulo="Nenhum cartão ainda"
            descricao="Cadastre o primeiro cartão para começar a acompanhar as faturas."
            acao={
              <Button asChild>
                <Link href="/cartoes">Cadastrar cartão</Link>
              </Button>
            }
          />
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:order-2">
            <SeletorPeriodo periodo={periodo} permitirIntervalo={false} />
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <StatCard icon={Receipt} cor="#6c4cf0" titulo="Total do mês" valor={formatCents(total)} className="p-3 lg:p-4" />
              <StatCard icon={CheckCircle2} cor="#0ea88c" titulo="Já pago" valor={formatCents(pagas)} tom="positivo" className="p-3 lg:p-4" />
              <StatCard
                icon={Hourglass}
                cor="#e2496b"
                titulo="A pagar"
                valor={formatCents(total - pagas)}
                tom={total - pagas > 0 ? "negativo" : "neutro"}
                className="p-3 lg:p-4"
              />
            </div>
            <AtualizarParciaisSheet key={competencia} faturas={todas} competencia={competencia} />
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
          </aside>

          <div className="flex flex-col gap-5 lg:order-1">
            <section className="flex flex-col gap-2">
              <SectionLabel extra={`${faturas.length} de ${todas.length}`}>Cartões</SectionLabel>
              {faturas.length === 0 ? (
                <EmptyState icon={Receipt} titulo="Nenhuma fatura com essa situação" />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {faturas.map((f) => (
                    <FaturaRow key={`${f.card.id}-${competencia}`} fatura={f} competencia={competencia} />
                  ))}
                </div>
              )}
            </section>

            <CardBase>
              <CardHeader>
                <CardTitle>Faturas por mês</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Meses futuros mostram só as parcelas já cadastradas (estimado).
                </p>
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
              </CardContent>
            </CardBase>
            <CardBase>
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
        </div>
      )}
    </div>
  );
}
