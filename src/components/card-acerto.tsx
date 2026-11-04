import { Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <CardHeader className="flex-row items-center gap-2">
        <Scale className="size-5 text-violeta" />
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
            <div className="grid grid-cols-2 gap-3">
              {acerto.porPessoa.map((p) => (
                <div key={p.userId} className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">{nome(p.userId)} pagou</p>
                  <p className="font-mono text-base tabular text-tinta">{formatCents(p.pagouCents)}</p>
                </div>
              ))}
            </div>
            {t ? (
              <p className="rounded-lg border border-border p-3 text-sm text-foreground">
                <strong>{nome(t.deUserId)}</strong> deve{" "}
                <strong className="font-mono tabular text-violeta">{formatCents(t.cents)}</strong> para{" "}
                <strong>{nome(t.paraUserId)}</strong>.
              </p>
            ) : (
              <p className="rounded-lg border border-border p-3 text-sm text-menta">Está tudo certo: ninguém deve nada.</p>
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
