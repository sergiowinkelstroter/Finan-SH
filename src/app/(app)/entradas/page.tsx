import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntradaDeleteButton } from "@/components/entrada-delete-button";
import { EntradaFormDialog } from "@/components/entrada-form-dialog";
import { TetoFormDialog } from "@/components/teto-form-dialog";
import { competenciaAtualISO, competenciaLabel } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { listarEntradas } from "@/server/entradas";
import { getTetoDoMes } from "@/server/orcamento";
import { listarUsuarios } from "@/server/usuarios";

export default async function EntradasPage() {
  const competencia = competenciaAtualISO();
  const [entradas, tetoCents, usuarios] = await Promise.all([
    listarEntradas(),
    getTetoDoMes(competencia),
    listarUsuarios(),
  ]);

  const fixas = entradas.filter((e) => e.tipo === "fixa");
  const extras = entradas.filter((e) => e.tipo === "extra");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Entradas</h1>
        <EntradaFormDialog usuarios={usuarios} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Teto de {competenciaLabel(competencia)}</CardTitle>
          <TetoFormDialog competencia={competencia} tetoAtualCents={tetoCents} />
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl tabular text-tinta">{formatCents(tetoCents)}</p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Fixas (todo mês)</h2>
        {fixas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma entrada fixa cadastrada.</p>
        ) : (
          fixas.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{e.descricao}</span>
                  <span className="text-xs text-muted-foreground">
                    {e.user?.nome ?? "—"}
                    {!e.ativo && " · inativa"}
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
          <p className="text-sm text-muted-foreground">Nenhuma entrada extra cadastrada.</p>
        ) : (
          extras.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{e.descricao}</span>
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
  );
}
