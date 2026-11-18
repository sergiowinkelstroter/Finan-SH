import { CalendarCheck, CheckCircle2, Gauge, Target } from "lucide-react";
import { MetaReservaDialog } from "@/components/meta-reserva-dialog";
import { Card } from "@/components/ui/card";
import { EmptyState, IconBubble } from "@/components/ds";
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
      <EmptyState
        icon={Target}
        titulo="Defina a meta da reserva"
        descricao="Quanto querem juntar e, se quiserem, até quando. O app acompanha o progresso e calcula o ritmo necessário."
        acao={<MetaReservaDialog metaCents={0} prazo={null} />}
        className="h-full justify-center"
      />
    );
  }

  const p = progresso;
  const previsao =
    p.mesesNoRitmo != null && p.mesesNoRitmo > 0
      ? competenciaLabel(addMesesCompetencia(competenciaAtualISO(), p.mesesNoRitmo))
      : null;
  const noPrazo =
    p.prazo && p.mesesNoRitmo != null && p.mesesAtePrazo != null ? p.mesesNoRitmo <= p.mesesAtePrazo : null;
  const pct = Math.min(1, Math.max(0, p.pct));
  const cor = p.atingida ? "#0ea88c" : "#6c4cf0";
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <Card className="flex h-full flex-col gap-5 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-3 font-display text-base font-semibold text-foreground">
          <IconBubble icon={p.atingida ? CheckCircle2 : Target} cor={cor} size="sm" />
          Meta da reserva
        </span>
        <MetaReservaDialog metaCents={p.metaCents} prazo={p.prazo} />
      </div>

      <div className="flex items-center gap-5">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r={R} fill="none" stroke="#efedf9" strokeWidth="12" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={cor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-semibold tabular text-tinta">{formatPercentual(Math.min(p.pct, 9.99))}</span>
            <span className="text-[11px] text-muted-foreground">da meta</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-xl font-semibold tabular text-tinta">{formatCents(saldoCents)}</span>
          <span className="font-mono text-sm tabular text-muted-foreground">de {formatCents(p.metaCents)}</span>
          <span
            className={`mt-1 inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              p.atingida ? "bg-menta/10 text-menta" : "bg-violeta/10 text-violeta"
            }`}
          >
            {p.atingida ? "Meta atingida! 🎉" : `faltam ${formatCents(p.faltaCents)}`}
          </span>
        </div>
      </div>

      {!p.atingida && (
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3">
            <Gauge className="mt-0.5 size-4 shrink-0 text-violeta" />
            <span>
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
            </span>
          </li>
          {p.prazo && p.aporteNecessarioCents != null && (
            <li className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3">
              <CalendarCheck className="mt-0.5 size-4 shrink-0 text-violeta" />
              <span>
                Para chegar em <strong className="capitalize text-foreground">{competenciaLabel(`${p.prazo}-01`)}</strong>:{" "}
                <strong className="font-mono tabular text-foreground">{formatCents(p.aporteNecessarioCents)}</strong>/mês{" "}
                {noPrazo != null && (
                  <span className={noPrazo ? "text-menta" : "text-rosa"}>
                    ({noPrazo ? "no ritmo" : "abaixo do ritmo necessário"})
                  </span>
                )}
              </span>
            </li>
          )}
          {p.prazo && p.mesesAtePrazo != null && p.mesesAtePrazo <= 0 && (
            <li className="rounded-2xl bg-rosa/10 p-3 text-rosa">O prazo já passou — atualize a meta.</li>
          )}
        </ul>
      )}
    </Card>
  );
}
