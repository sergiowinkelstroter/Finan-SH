import { ArrowDownLeft, ArrowUpRight, BarChart3, PiggyBank, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoriaIcone } from "@/components/categoria-icone";
import { EmptyState, ListItem, PageHeader, StatCard } from "@/components/ds";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { VariacaoBadge } from "@/components/variacao-badge";
import { CardAcerto } from "@/components/card-acerto";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HBarList } from "@/components/charts/hbar-list";
import { LineChart } from "@/components/charts/line-chart";
import { SankeyFluxo } from "@/components/charts/sankey-fluxo";
import { formatDataCurta } from "@/lib/dates";
import { formatCents, formatPercentual } from "@/lib/money";
import { diasDoPeriodo, parsePeriodo } from "@/lib/periodo";
import { um, type SearchParams } from "@/lib/search";
import { getAnaliseComparada } from "@/server/analise";
import { garantirRecorrencias } from "@/server/recorrencias";

export default async function AnalisesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  await garantirRecorrencias();
  const { atual, anterior, deltaGasto, deltaEntradas, categoriasAnterior } = await getAnaliseComparada(periodo);
  const dias = diasDoPeriodo(periodo);
  const varios = atual.porMes.length > 1;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={BarChart3}
        titulo="Análises"
        subtitulo={<span className="capitalize">{periodo.label}</span>}
      />

      <div className="lg:max-w-md">
        <SeletorPeriodo periodo={periodo} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={ArrowDownLeft}
          cor="#0ea88c"
          titulo="Entradas"
          valor={formatCents(atual.entradasCents)}
          tom="positivo"
          detalhe={<VariacaoBadge valor={deltaEntradas} inverso={false} sufixo="vs. anterior" />}
        />
        <StatCard
          icon={ArrowUpRight}
          cor="#e2496b"
          titulo="Gastos"
          valor={formatCents(atual.gastoCents)}
          detalhe={<VariacaoBadge valor={deltaGasto} sufixo="vs. anterior" />}
        />
        <StatCard
          icon={Wallet}
          cor="#6c4cf0"
          titulo="Sobra"
          valor={formatCents(atual.sobraCents)}
          tom={atual.sobraCents < 0 ? "negativo" : "positivo"}
          detalhe={`anterior: ${formatCents(anterior.sobraCents)}`}
        />
        <StatCard
          icon={PiggyBank}
          cor="#10b981"
          titulo="Taxa de poupança"
          valor={atual.taxaPoupanca == null ? "—" : formatPercentual(atual.taxaPoupanca)}
          tom={atual.taxaPoupanca != null && atual.taxaPoupanca < 0 ? "negativo" : undefined}
          detalhe={`${formatCents(Math.round(atual.gastoCents / dias))}/dia em média`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{varios ? "Entradas × gastos por mês" : "Entradas × gastos × teto"}</CardTitle>
          </CardHeader>
          <CardContent>
            {varios ? (
              <BarChart
                series={[
                  { nome: "Entradas", cor: "#0ea88c" },
                  { nome: "Gastos", cor: "#e2496b" },
                  { nome: "Teto", cor: "#c9c3f5" },
                ]}
                dados={atual.porMes.map((l) => ({
                  label: l.label,
                  valores: [l.entradasCents, l.gastoCents, l.tetoCents],
                }))}
              />
            ) : (
              <BarChart
                series={[{ nome: "Valor", cor: "#6c4cf0" }]}
                dados={[
                  { label: "Entradas", valores: [atual.entradasCents] },
                  { label: "Cartões", valores: [atual.gastoCartoesCents] },
                  { label: "Saídas", valores: [atual.gastoSaidasCents] },
                  { label: "Teto", valores: [atual.tetoCents] },
                ]}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              fatias={atual.porCategoria}
              centro={{ titulo: "Total", valor: formatCents(atual.gastoCents) }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Para onde foi o dinheiro</CardTitle>
        </CardHeader>
        <CardContent>
          <SankeyFluxo
            entradasCents={atual.entradasCents}
            reservaCents={atual.reservaCents}
            categorias={atual.porCategoriaOrigem}
            altura={340}
          />
        </CardContent>
      </Card>

      {varios && (
        <Card>
          <CardHeader>
            <CardTitle>Sobra mês a mês</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={atual.porMes.map((l) => l.label)}
              series={[
                { nome: "Sobra", cor: "#6c4cf0", valores: atual.porMes.map((l) => l.entradasCents - l.gastoCents) },
                { nome: "Guardado", cor: "#0ea88c", tracejada: true, valores: atual.porMes.map((l) => l.reservaCents) },
              ]}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Categorias vs. período anterior</CardTitle>
          </CardHeader>
          <CardContent>
            {atual.porCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem gastos no período.</p>
            ) : (
              <HBarList
                itens={atual.porCategoria.slice(0, 10).map((c) => ({
                  ...c,
                  anteriorCents: categoriasAnterior.get(c.nome),
                }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-5">
          <CardAcerto acerto={atual.acerto} usuarios={atual.usuarios} />
          <Card>
            <CardHeader>
              <CardTitle>Maiores saídas</CardTitle>
            </CardHeader>
            <CardContent className="-mx-4 -mb-2 flex flex-col">
              {atual.maioresSaidas.length === 0 ? (
                <EmptyState icon={Receipt} titulo="Nenhuma saída no período" className="mx-4 mb-4" />
              ) : (
                atual.maioresSaidas.map((s, i) => (
                  <ListItem
                    key={s.id}
                    className="py-2.5"
                    leading={
                      <span className="relative">
                        <CategoriaIcone nome={s.categoria} />
                        <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-tinta text-[9px] font-bold text-white">
                          {i + 1}
                        </span>
                      </span>
                    }
                    titulo={s.descricao}
                    subtitulo={
                      <>
                        {formatDataCurta(s.data)}
                        {s.categoria ? ` · ${s.categoria}` : ""}
                        {s.id < 0 ? " · previsto" : ""}
                      </>
                    }
                    trailing={<span className="font-mono text-sm font-semibold tabular text-tinta">{formatCents(s.valorCents)}</span>}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Cartões entram pelo valor efetivo da fatura de cada mês tocado pelo período (real, parcial ou estimado);
        saídas pela data exata, incluindo previsões virtuais de recorrências futuras. Comparação feita com o período imediatamente anterior, de mesma duração.
      </p>
    </div>
  );
}
