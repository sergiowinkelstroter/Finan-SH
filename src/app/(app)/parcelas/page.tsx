import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompraFormDialog } from "@/components/compra-form-dialog";
import { CompraDeleteButton } from "@/components/compra-delete-button";
import { addMesesCompetencia, competenciaAtualISO, competenciaLabelCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getComprometidoPorMes, listarCompras } from "@/server/compras";
import { listarCartoes } from "@/server/cartoes";
import { listarUsuarios } from "@/server/usuarios";

export default async function ParcelasPage() {
  const [compras, cartoes, usuarios, comprometidoMapa] = await Promise.all([
    listarCompras(),
    listarCartoes({ soAtivos: true }),
    listarUsuarios(),
    getComprometidoPorMes(),
  ]);

  const inicio = competenciaAtualISO();
  const timeline = Array.from({ length: 6 }, (_, i) => {
    const competencia = addMesesCompetencia(inicio, i);
    return {
      competencia,
      label: competenciaLabelCurta(competencia),
      valorCents: comprometidoMapa.get(competencia) ?? 0,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Parcelas</h1>
        <CompraFormDialog cartoes={cartoes} usuarios={usuarios} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comprometido por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-2 text-sm">
            {timeline.map((m) => (
              <div key={m.competencia} className="flex flex-col items-center gap-1">
                <span className="capitalize text-muted-foreground">{m.label}</span>
                <span className="font-mono tabular text-bruma">
                  ~{formatCents(m.valorCents)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {compras.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma compra parcelada ainda. Cadastre a primeira para acompanhar o comprometido.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {compras.map((compra) => (
            <Card key={compra.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{compra.descricao}</span>
                  <span className="text-xs text-muted-foreground">
                    {compra.card.nome}
                    {compra.comprador ? ` · ${compra.comprador.nome}` : ""} ·{" "}
                    {compra.qtdParcelas}x
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono tabular text-tinta">
                    {formatCents(compra.valorTotalCents)}
                  </span>
                  <CompraDeleteButton id={compra.id} descricao={compra.descricao} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
