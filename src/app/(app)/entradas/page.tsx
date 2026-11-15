import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Entradas</h1>
        <EntradaFormDialog usuarios={usuarios} />
      </div>

      <div className="max-w-md">
        <SeletorPeriodo periodo={periodo} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 text-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Entradas no período</span>
            <span className="font-mono text-base font-semibold tabular text-menta">{formatCents(totalCents)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Tetos somados</span>
            <span className="font-mono text-base font-semibold tabular text-tinta">{formatCents(tetoTotal)}</span>
          </div>
        </CardContent>
      </Card>

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

      {periodo.modo === "mes" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="capitalize">Teto de {competenciaLabel(competencia)}</CardTitle>
            <TetoFormDialog competencia={competencia} tetoAtualCents={tetoCents} />
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl tabular text-tinta">{formatCents(tetoCents)}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Fixas (vigentes no período)</h2>
        {fixas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada fixa neste período.</p>
        ) : (
          fixas.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium text-foreground">{e.descricao}{!e.ativo && <Badge variant="muted">inativa</Badge>}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.user?.nome ?? "—"}
                    {e.vigenciaInicio && ` · desde ${formatDataCurta(e.vigenciaInicio)}`}
                    {e.vigenciaFim && ` · até ${formatDataCurta(e.vigenciaFim)}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular text-tinta">
                    {formatCents(e.valorCents)}
                  </span>
                  <EntradaFormDialog
                    usuarios={usuarios}
                    entrada={e}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <EntradaDeleteButton id={e.id} descricao={e.descricao} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Extras</h2>
        {extras.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada extra neste período.</p>
        ) : (
          extras.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 font-medium text-foreground">{e.descricao}{!e.ativo && <Badge variant="muted">inativa</Badge>}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="muted">
                      {e.competencia ? competenciaLabel(e.competencia) : ""}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {e.user?.nome ?? "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular text-tinta">
                    {formatCents(e.valorCents)}
                  </span>
                  <EntradaFormDialog
                    usuarios={usuarios}
                    entrada={e}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <EntradaDeleteButton id={e.id} descricao={e.descricao} />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
      </div>
    </div>
  );
}
