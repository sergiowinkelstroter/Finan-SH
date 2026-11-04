import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CartaoFormDialog } from "@/components/cartao-form-dialog";
import { CartaoArquivarButton } from "@/components/cartao-arquivar-button";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { listarCartoes } from "@/server/cartoes";
import { getLimiteComprometidoPorCartao } from "@/server/compras";
import { Progress } from "@/components/ui/progress";
import { listarUsuarios } from "@/server/usuarios";

export default async function CartoesPage() {
  const [cartoes, usuarios, comprometido] = await Promise.all([
    listarCartoes(),
    listarUsuarios(),
    getLimiteComprometidoPorCartao(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Cartões</h1>
        <CartaoFormDialog usuarios={usuarios} />
      </div>

      {cartoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão ainda. Cadastre o primeiro para começar a acompanhar.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cartoes.map((cartao) => (
            <Card key={cartao.id} className={cartao.ativo ? undefined : "opacity-60"}>
              <CardContent className="flex flex-col gap-3 p-4">
               <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{cartao.nome}</span>
                    {cartao.bandeira && (
                      <Badge variant="muted">{cartao.bandeira}</Badge>
                    )}
                    {!cartao.ativo && <Badge variant="muted">arquivado</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {cartao.titular ? `${cartao.titular.nome} · ` : ""}
                    fecha dia {cartao.diaFechamento} · vence dia {cartao.diaVencimento}
                    {cartao.limiteCents ? ` · limite ${formatCents(cartao.limiteCents)}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <CartaoFormDialog
                    usuarios={usuarios}
                    cartao={cartao}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <CartaoArquivarButton id={cartao.id} ativo={cartao.ativo} />
                </div>
               </div>
               {cartao.limiteCents ? (
                 <LimiteUso usado={comprometido.get(cartao.id) ?? 0} limite={cartao.limiteCents} />
               ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LimiteUso({ usado, limite }: { usado: number; limite: number }) {
  const pct = Math.min(100, (usado / limite) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={pct} className={pct >= 90 ? "[&>div]:bg-rosa" : undefined} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCents(usado)} comprometido em parcelas</span>
        <span className="font-mono tabular">livre {formatCents(Math.max(0, limite - usado))}</span>
      </div>
    </div>
  );
}
