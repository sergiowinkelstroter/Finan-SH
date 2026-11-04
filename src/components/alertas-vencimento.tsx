import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { AlertaVencimento } from "@/server/faturas";

export function AlertasVencimento({ alertas }: { alertas: AlertaVencimento[] }) {
  if (alertas.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {alertas.map(({ fatura, dias }) => {
        const atrasada = dias < 0;
        const Icon = atrasada ? AlertTriangle : CalendarClock;
        return (
          <Link
            key={`${fatura.card.id}-${fatura.competencia}`}
            href={`/faturas?mes=${fatura.competencia.slice(0, 7)}`}
            className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
              atrasada
                ? "border-rosa/40 bg-rosa/10 text-rosa"
                : dias <= 2
                  ? "border-amber-400/50 bg-amber-100/60 text-amber-800"
                  : "border-border bg-card text-foreground"
            }`}
          >
            <Icon className="size-5 shrink-0" />
            <span className="flex-1">
              <strong>{fatura.card.nome}</strong>{" "}
              {atrasada
                ? `venceu há ${-dias} dia${dias === -1 ? "" : "s"}`
                : dias === 0
                  ? "vence hoje"
                  : `vence em ${dias} dia${dias === 1 ? "" : "s"}`}{" "}
              <span className="opacity-70">({formatDataCurta(fatura.vencimento)})</span>
            </span>
            <span className="font-mono tabular">{formatCents(fatura.valorCents)}</span>
          </Link>
        );
      })}
    </div>
  );
}
