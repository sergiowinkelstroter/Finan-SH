import { Banknote, Gauge, Gift, Pencil, Repeat, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, IconBubble, ListCard, ListItem, PageHeader, SectionLabel, StatCard } from "@/components/ds";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntradaDeleteButton } from "@/components/entrada-delete-button";
import { EntradaFormDialog } from "@/components/entrada-form-dialog";
import { TetoFormDialog } from "@/components/teto-form-dialog";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { BarChart } from "@/components/charts/bar-chart";
import { competenciaLabel, competenciaLabelCurta, formatDataCurta } from "@/lib/dates";
import { parsePeriodo } from "@/lib/periodo";
import { um, type SearchParams } from "@/lib/search";
import { formatCents } from "@/lib/money";
import { listarEntradasDoPeriodo } from "@/server/entradas";
import { getTetoDoMes, tetosPorMes } from "@/server/orcamento";
import { listarUsuarios } from "@/server/usuarios";

export default async function EntradasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  const competencia = periodo.competencia;
  const [{ fixas, extras, porMes, totalCents }, tetoCents, tetos, usuarios] = await Promise.all([
    listarEntradasDoPeriodo(periodo),
    getTetoDoMes(competencia),
    tetosPorMes(periodo.competencias),
    listarUsuarios(),
  ]);
  const tetoTotal = [...tetos.values()].reduce((a, b) => a + b, 0);

  const editar = (e: (typeof fixas)[number]) => (
    <>
      <EntradaFormDialog
        usuarios={usuarios}
        entrada={e}
        trigger={
          <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${e.descricao}`}>
            <Pencil />
          </Button>
        }
      />
      <EntradaDeleteButton id={e.id} descricao={e.descricao} />
    </>
  );
  const totalFixas = fixas.reduce((s, e) => s + e.valorCents, 0);
  const totalExtras = extras.reduce((s, e) => s + e.valorCents, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={TrendingUp}
        titulo="Entradas"
        subtitulo="Salários, extras e o teto de gastos de cada mês."
        acoes={<EntradaFormDialog usuarios={usuarios} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:order-2">
          <SeletorPeriodo periodo={periodo} />
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <StatCard icon={Banknote} cor="#0ea88c" titulo="Entradas no período" valor={formatCents(totalCents)} tom="positivo" className="p-3 lg:p-4" />
            <StatCard icon={Gauge} cor="#6c4cf0" titulo="Tetos somados" valor={formatCents(tetoTotal)} className="p-3 lg:p-4" />
          </div>

          {periodo.modo === "mes" && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <IconBubble icon={Gauge} cor="#6c4cf0" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs capitalize text-muted-foreground">Teto de {competenciaLabel(competencia)}</span>
                  <span className="font-mono text-lg font-semibold tabular text-tinta">{formatCents(tetoCents)}</span>
                </div>
                <TetoFormDialog competencia={competencia} tetoAtualCents={tetoCents} />
              </CardContent>
            </Card>
          )}
        </aside>

        <div className="flex flex-col gap-5 lg:order-1">
          {periodo.competencias.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Entradas × teto por mês</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChart
                  series={[
                    { nome: "Entradas", cor: "#0ea88c" },
                    { nome: "Teto", cor: "#6c4cf0" },
                  ]}
                  dados={periodo.competencias.map((c) => ({
                    label: competenciaLabelCurta(c),
                    valores: [porMes.get(c) ?? 0, tetos.get(c) ?? 0],
                  }))}
                />
              </CardContent>
            </Card>
          )}

          <section className="flex flex-col gap-2">
            <SectionLabel extra={fixas.length > 0 ? `${formatCents(totalFixas)}/mês` : undefined}>Fixas (vigentes no período)</SectionLabel>
            {fixas.length === 0 ? (
              <EmptyState icon={Repeat} titulo="Nenhuma entrada fixa" descricao="Cadastre salários e rendas que se repetem todo mês." />
            ) : (
              <ListCard>
                {fixas.map((e) => (
                  <ListItem
                    key={e.id}
                    muted={!e.ativo}
                    leading={<IconBubble icon={Repeat} cor="#0ea88c" />}
                    titulo={e.descricao}
                    subtitulo={
                      <>
                        <span>{e.user?.nome ?? "—"}</span>
                        {e.vigenciaInicio && <span>· desde {formatDataCurta(e.vigenciaInicio)}</span>}
                        {e.vigenciaFim && <span>· até {formatDataCurta(e.vigenciaFim)}</span>}
                        {!e.ativo && <Badge variant="muted">inativa</Badge>}
                      </>
                    }
                    trailing={<span className="font-mono text-sm font-semibold tabular text-menta">+{formatCents(e.valorCents)}</span>}
                    acoes={editar(e)}
                  />
                ))}
              </ListCard>
            )}
          </section>

          <section className="flex flex-col gap-2">
            <SectionLabel extra={extras.length > 0 ? formatCents(totalExtras) : undefined}>Extras</SectionLabel>
            {extras.length === 0 ? (
              <EmptyState icon={Gift} titulo="Nenhuma entrada extra" descricao="13º, bônus, freelas e reembolsos aparecem aqui." />
            ) : (
              <ListCard>
                {extras.map((e) => (
                  <ListItem
                    key={e.id}
                    muted={!e.ativo}
                    leading={<IconBubble icon={Gift} cor="#2e6be6" />}
                    titulo={e.descricao}
                    subtitulo={
                      <>
                        {e.competencia && <Badge variant="muted" className="capitalize">{competenciaLabel(e.competencia)}</Badge>}
                        <span>{e.user?.nome ?? "—"}</span>
                        {!e.ativo && <Badge variant="muted">inativa</Badge>}
                      </>
                    }
                    trailing={<span className="font-mono text-sm font-semibold tabular text-menta">+{formatCents(e.valorCents)}</span>}
                    acoes={editar(e)}
                  />
                ))}
              </ListCard>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
