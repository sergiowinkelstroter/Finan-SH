import { AporteDeleteButton } from "@/components/aporte-delete-button";
import { AporteFormDialog } from "@/components/aporte-form-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { SimuladorReserva } from "@/components/simulador-reserva";
import { formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getReservaAtual, listarAportes } from "@/server/reserva";

export default async function ReservaPage() {
  const [reservaAtualCents, aportes] = await Promise.all([
    getReservaAtual(),
    listarAportes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Reserva</h1>
        <AporteFormDialog />
      </div>

      <section>
        <p className="text-sm text-muted-foreground">Saldo atual</p>
        <p className="mt-1 font-display text-[44px] font-semibold leading-none tabular text-tinta">
          {formatCents(reservaAtualCents)}
        </p>
      </section>

      <SimuladorReserva saldoInicialCents={reservaAtualCents} />

      {aportes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento ainda. Registre o primeiro aporte para começar a acompanhar.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {aportes.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">
                    {a.descricao || (a.valorCents >= 0 ? "Aporte" : "Resgate")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDataCurta(a.data)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono tabular ${
                      a.valorCents >= 0 ? "text-menta" : "text-rosa"
                    }`}
                  >
                    {a.valorCents >= 0 ? "+" : ""}
                    {formatCents(a.valorCents)}
                  </span>
                  <AporteDeleteButton
                    id={a.id}
                    descricao={a.descricao || "lançamento"}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
