import { ArrowRight, CheckCircle2, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconBubble } from "@/components/ds";
import type { Acerto } from "@/lib/calculos";
import { formatCents } from "@/lib/money";

export function CardAcerto({
  acerto,
  usuarios,
}: {
  acerto: Acerto;
  usuarios: { id: number; nome: string }[];
}) {
  const nome = (id: number) => usuarios.find((u) => u.id === id)?.nome ?? "—";
  const t = acerto.transferencia;
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3">
        <IconBubble icon={Scale} size="sm" />
        <CardTitle>Acerto do casal</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {acerto.totalCents === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum gasto dividido com pagador identificado neste período. Informe &quot;pago por&quot; nas saídas
            e o titular nos cartões.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {acerto.porPessoa.map((p) => (
                <div key={p.userId} className="rounded-2xl bg-muted/70 p-3">
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex size-6 items-center justify-center rounded-full bg-violeta/15 text-[11px] font-semibold text-violeta">
                      {nome(p.userId).charAt(0)}
                    </span>
                    {nome(p.userId)} pagou
                  </p>
                  <p className="mt-1.5 font-mono text-base font-semibold tabular text-tinta">{formatCents(p.pagouCents)}</p>
                </div>
              ))}
            </div>
            {t ? (
              <div className="flex items-center gap-2 rounded-2xl bg-violeta/10 p-3 text-sm text-foreground">
                <strong>{nome(t.deUserId)}</strong>
                <ArrowRight className="size-4 text-violeta" />
                <strong>{nome(t.paraUserId)}</strong>
                <span className="ml-auto font-mono font-semibold tabular text-violeta">{formatCents(t.cents)}</span>
              </div>
            ) : (
              <p className="flex items-center gap-2 rounded-2xl bg-menta/10 p-3 text-sm font-medium text-menta">
                <CheckCircle2 className="size-4" /> Está tudo certo: ninguém deve nada.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Considera saídas e parcelas marcadas como &quot;dividir&quot;. Parcelas contam para o titular do cartão.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
