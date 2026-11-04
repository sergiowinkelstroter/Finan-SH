import { Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecorrenciaControles } from "@/components/recorrencia-controles";
import { RecorrenciaFormDialog } from "@/components/recorrencia-form-dialog";
import { corCategoria } from "@/lib/categorias";
import { formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { categoriasDeSaidas } from "@/server/saidas";
import { listarRecorrencias } from "@/server/recorrencias";
import { listarUsuarios } from "@/server/usuarios";

export default async function RecorrenciasPage() {
  const [lista, usuarios, usadas] = await Promise.all([listarRecorrencias(), listarUsuarios(), categoriasDeSaidas()]);
  const ativas = lista.filter((r) => r.ativo);
  const totalMensal = ativas.reduce((s, r) => s + r.valorCents, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">Recorrências</h1>
          <p className="text-sm text-muted-foreground">
            Contas fixas lançadas sozinhas todo mês em Saídas.
          </p>
        </div>
        <RecorrenciaFormDialog usuarios={usuarios} categorias={usadas} />
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 text-center">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Ativas</span>
            <span className="font-mono text-base font-semibold tabular">{ativas.length}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Total por mês</span>
            <span className="font-mono text-base font-semibold tabular">{formatCents(totalMensal)}</span>
          </div>
        </CardContent>
      </Card>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma recorrência ainda. Cadastre aluguel, condomínio, internet, assinaturas…
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((r) => (
            <Card key={r.id} className={r.ativo ? undefined : "opacity-60"}>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <Repeat className="size-4 shrink-0 text-violeta" />
                      <span className="truncate">{r.descricao}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      todo dia {r.diaMes} · desde {formatDataCurta(r.inicio)}
                      {r.fim ? ` até ${formatDataCurta(r.fim)}` : ""}
                      {r.pagador ? ` · ${r.pagador.nome}` : ""}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {r.categoria && (
                        <Badge variant="muted">
                          <span className="mr-1 size-1.5 rounded-full" style={{ background: corCategoria(r.categoria) }} />
                          {r.categoria}
                        </Badge>
                      )}
                      {!r.ativo && <Badge variant="muted">pausada</Badge>}
                      {!r.compartilhada && <Badge variant="outline">individual</Badge>}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono tabular text-tinta">{formatCents(r.valorCents)}</span>
                </div>
                <div className="flex justify-end gap-1">
                  <RecorrenciaFormDialog
                    usuarios={usuarios}
                    categorias={usadas}
                    recorrencia={r}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <RecorrenciaControles id={r.id} ativo={r.ativo} descricao={r.descricao} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
