import { CheckCircle2, Target } from "lucide-react";
import { MetaReservaDialog } from "@/components/meta-reserva-dialog";
import { Progress } from "@/components/ui/progress";
import { addMesesCompetencia, competenciaAtualISO, competenciaLabel } from "@/lib/dates";
import { formatCents, formatPercentual } from "@/lib/money";
import type { getProgressoMeta } from "@/server/reserva";

type Progresso = NonNullable<Awaited<ReturnType<typeof getProgressoMeta>>>;

export function CardMetaReserva({
  progresso,
  saldoCents,
}: {
  progresso: Progresso | null;
  saldoCents: number;
}) {
  if (!progresso) {
    return (
      <section className="flex flex-col justify-center gap-3 rounded-xl border border-dashed border-border bg-card p-5">
        <div className="flex items-center gap-2 text-foreground">
          <Target className="size-5 text-violeta" />
          <span className="font-display text-base font-semibold">Meta da reserva</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Defina quanto querem juntar e, se quiserem, até quando. O app acompanha o progresso e calcula o ritmo
          necessário.
        </p>
        <div>
          <MetaReservaDialog metaCents={0} prazo={null} />
        </div>
      </section>
    );
  }

  const p = progresso;
  const previsao =
    p.mesesNoRitmo != null && p.mesesNoRitmo > 0
      ? competenciaLabel(addMesesCompetencia(competenciaAtualISO(), p.mesesNoRitmo))
      : null;
  const noPrazo =
    p.prazo && p.mesesNoRitmo != null && p.mesesAtePrazo != null ? p.mesesNoRitmo <= p.mesesAtePrazo : null;

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          {p.atingida ? <CheckCircle2 className="size-5 text-menta" /> : <Target className="size-5 text-violeta" />}
          Meta da reserva
        </span>
        <MetaReservaDialog metaCents={p.metaCents} prazo={p.prazo} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-lg font-semibold tabular text-tinta">{formatCents(saldoCents)}</span>
          <span className="font-mono text-sm tabular text-muted-foreground">de {formatCents(p.metaCents)}</span>
        </div>
        <Progress value={Math.min(100, p.pct * 100)} className={p.atingida ? "[&>div]:bg-menta" : undefined} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatPercentual(Math.min(p.pct, 9.99))} da meta</span>
          <span>{p.atingida ? "Meta atingida! 🎉" : `faltam ${formatCents(p.faltaCents)}`}</span>
        </div>
      </div>

      {!p.atingida && (
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li>
            Ritmo dos últimos 6 meses:{" "}
            <strong className="font-mono tabular text-foreground">{formatCents(p.aporteMedioMensalCents)}</strong>/mês
            {previsao ? (
              <>
                {" "}
                → meta em <strong className="capitalize text-foreground">{previsao}</strong>
              </>
            ) : (
              " — sem aportes recentes para prever."
            )}
          </li>
          {p.prazo && p.aporteNecessarioCents != null && (
            <li>
              Para chegar em <strong className="capitalize text-foreground">{competenciaLabel(`${p.prazo}-01`)}</strong>:{" "}
              <strong className="font-mono tabular text-foreground">{formatCents(p.aporteNecessarioCents)}</strong>/mês{" "}
              {noPrazo != null && (
                <span className={noPrazo ? "text-menta" : "text-rosa"}>
                  ({noPrazo ? "no ritmo" : "abaixo do ritmo necessário"})
                </span>
              )}
            </li>
          )}
          {p.prazo && p.mesesAtePrazo != null && p.mesesAtePrazo <= 0 && (
            <li className="text-rosa">O prazo já passou — atualize a meta.</li>
          )}
        </ul>
      )}
    </section>
  );
}
