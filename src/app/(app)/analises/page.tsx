import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { VariacaoBadge } from "@/components/variacao-badge";
import { CardAcerto } from "@/components/card-acerto";
import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { HBarList } from "@/components/charts/hbar-list";
import { LineChart } from "@/components/charts/line-chart";
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">Análises</h1>
          <p className="text-sm capitalize text-muted-foreground">{periodo.label}</p>
        </div>
        <div className="lg:w-[420px]">
          <SeletorPeriodo periodo={periodo} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi titulo="Entradas" valor={formatCents(atual.entradasCents)} cor="text-menta">
          <VariacaoBadge valor={deltaEntradas} inverso={false} sufixo="vs. anterior" />
        </Kpi>
        <Kpi titulo="Gastos" valor={formatCents(atual.gastoCents)}>
          <VariacaoBadge valor={deltaGasto} sufixo="vs. anterior" />
        </Kpi>
        <Kpi
          titulo="Sobra"
          valor={formatCents(atual.sobraCents)}
          cor={atual.sobraCents < 0 ? "text-rosa" : "text-menta"}
        >
          <span className="text-xs text-muted-foreground">anterior: {formatCents(anterior.sobraCents)}</span>
        </Kpi>
        <Kpi
          titulo="Taxa de poupança"
          valor={atual.taxaPoupanca == null ? "—" : formatPercentual(atual.taxaPoupanca)}
          cor={atual.taxaPoupanca != null && atual.taxaPoupanca < 0 ? "text-rosa" : undefined}
        >
          <span className="text-xs text-muted-foreground">
            {formatCents(Math.round(atual.gastoCents / dias))}/dia em média
          </span>
        </Kpi>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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

      {varios && (
        <Card>
          <CardHeader>
            <CardTitle>Sobra mês a mês</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              labels={atual.porMes.map((l) => l.label)}
              series={[{ nome: "Sobra", cor: "#6c4cf0", valores: atual.porMes.map((l) => l.entradasCents - l.gastoCents) }]}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
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

        <div className="flex flex-col gap-6">
          <CardAcerto acerto={atual.acerto} usuarios={atual.usuarios} />
          <Card>
            <CardHeader>
              <CardTitle>Maiores saídas avulsas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {atual.maioresSaidas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma saída no período.</p>
              ) : (
                atual.maioresSaidas.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-foreground">{s.descricao}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDataCurta(s.data)}
                        {s.categoria ? ` · ${s.categoria}` : ""}
                      </span>
                    </span>
                    <span className="font-mono tabular text-tinta">{formatCents(s.valorCents)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Cartões entram pelo valor efetivo da fatura de cada mês tocado pelo período (real, parcial ou estimado);
        saídas avulsas pela data exata. Comparação feita com o período imediatamente anterior, de mesma duração.
      </p>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  cor,
  children,
}: {
  titulo: string;
  valor: string;
  cor?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="text-xs text-muted-foreground">{titulo}</span>
        <span className={`font-mono text-lg font-semibold tabular lg:text-xl ${cor ?? "text-tinta"}`}>{valor}</span>
        {children}
      </CardContent>
    </Card>
  );
}
