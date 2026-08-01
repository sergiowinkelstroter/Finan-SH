import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedidorRitmo } from "@/components/medidor-ritmo";
import { ValorEfetivo } from "@/components/valor-efetivo";
import { AtualizarParciaisSheet } from "@/components/atualizar-parciais-sheet";
import { competenciaAtualISO, competenciaLabel, diasDesde } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getResumoMes } from "@/server/dashboard";

export default async function DashboardPage() {
  const competencia = competenciaAtualISO();
  const resumo = await getResumoMes(competencia);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl font-semibold capitalize text-foreground">
        {competenciaLabel(competencia)}
      </h1>

      <section>
        <p className="text-sm text-muted-foreground">Ainda podem gastar</p>
        <p className="mt-1 font-display text-[52px] font-semibold leading-none tabular text-tinta">
          {formatCents(resumo.disponivelCents)}
        </p>

        <div className="mt-5">
          <MedidorRitmo
            pctTeto={resumo.ritmo.pctTeto}
            pctMes={resumo.ritmo.pctMes}
            diaAtual={resumo.diaAtual}
            estourou={resumo.estourouTeto}
          />
        </div>
      </section>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          <ResumoRow label="Entradas" valorCents={resumo.entradasCents} />
          <ResumoRow
            label="Gasto até agora"
            valorCents={resumo.gastoCents}
            tipo={resumo.gastoTipo}
          />
          <ResumoRow label="Teto do mês" valorCents={resumo.tetoCents} />
          <ResumoRow label="Reserva" valorCents={resumo.reservaAtualCents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturas do mês</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {resumo.faturas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cartão ainda. Cadastre o primeiro para começar a acompanhar.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2.5">
                {resumo.faturas.map((f) => (
                  <div key={f.card.id} className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">
                      {f.card.nome}
                    </span>
                    <ValorEfetivo
                      valorCents={f.valorCents}
                      tipo={f.tipo}
                      diasDesdeAtualizacao={
                        f.invoice?.parcialAtualizadoEm
                          ? diasDesde(f.invoice.parcialAtualizadoEm)
                          : null
                      }
                    />
                  </div>
                ))}
              </div>
              <AtualizarParciaisSheet faturas={resumo.faturas} competencia={competencia} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprometido à frente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-2 text-sm">
            {resumo.comprometidoProximosMeses.map((m) => (
              <Link
                key={m.competencia}
                href="/projecao"
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
              >
                <span className="capitalize text-muted-foreground">{m.label}</span>
                <span className="font-mono tabular text-bruma">
                  ~{formatCents(m.valorCents)}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResumoRow({
  label,
  valorCents,
  tipo,
}: {
  label: string;
  valorCents: number;
  tipo?: "real" | "parcial" | "estimado";
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {tipo ? (
        <ValorEfetivo valorCents={valorCents} tipo={tipo} />
      ) : (
        <span className="font-mono tabular text-tinta">{formatCents(valorCents)}</span>
      )}
    </div>
  );
}
