import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SaidaDeleteButton } from "@/components/saida-delete-button";
import { SaidaFormDialog } from "@/components/saida-form-dialog";
import { formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { listarSaidas } from "@/server/saidas";
import { listarUsuarios } from "@/server/usuarios";

export default async function SaidasPage() {
  const [saidas, usuarios] = await Promise.all([listarSaidas(), listarUsuarios()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Saídas</h1>
        <SaidaFormDialog usuarios={usuarios} />
      </div>

      {saidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma saída avulsa ainda. Registre aluguel, condomínio ou mercado no débito.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {saidas.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{s.descricao}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{formatDataCurta(s.data)}</span>
                    {s.categoria && <Badge variant="muted">{s.categoria}</Badge>}
                    {s.pagador && <span>· {s.pagador.nome}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular text-tinta">
                    {formatCents(s.valorCents)}
                  </span>
                  <SaidaFormDialog
                    usuarios={usuarios}
                    saida={s}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <SaidaDeleteButton id={s.id} descricao={s.descricao} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
