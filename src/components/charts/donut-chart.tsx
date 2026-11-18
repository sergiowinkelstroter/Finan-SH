"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCents, formatPercentual } from "@/lib/money";

export interface FatiaDonut {
  nome: string;
  cents: number;
  cor: string;
}

/** Rosca interativa + legenda completa (todos os dados visíveis, sem rolar). */
export function DonutChart({
  fatias,
  centro,
  maxLegenda = 8,
}: {
  fatias: FatiaDonut[];
  centro?: { titulo: string; valor: string };
  maxLegenda?: number;
}) {
  const total = fatias.reduce((s, f) => s + f.cents, 0);
  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">Sem gastos no período.</p>;
  }
  const visiveis = fatias.slice(0, maxLegenda);
  const resto = fatias.slice(maxLegenda).reduce((s, f) => s + f.cents, 0);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative size-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={fatias} dataKey="cents" nameKey="nome" innerRadius="68%" outerRadius="100%" paddingAngle={2} cornerRadius={6} stroke="none" startAngle={90} endAngle={-270}>
              {fatias.map((f) => (
                <Cell key={f.nome} fill={f.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => `${formatCents(Number(v))} (${formatPercentual(Number(v) / total)})`}
              contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 24px -6px rgb(26 24 48 / 0.18)", fontSize: 12, padding: "8px 12px" }}
            labelStyle={{ fontWeight: 600, color: "#1a1830", marginBottom: 2, textTransform: "capitalize" }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centro && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{centro.titulo}</span>
            <span className="font-mono text-base font-semibold tabular text-tinta">{centro.valor}</span>
          </div>
        )}
      </div>
      <ul className="flex w-full flex-col gap-2 text-sm">
        {visiveis.map((f) => (
          <li key={f.nome} className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: f.cor }} />
              <span className="truncate text-foreground">{f.nome}</span>
            </span>
            <span className="shrink-0 font-mono text-xs tabular text-muted-foreground">
              {formatPercentual(f.cents / total)} · {formatCents(f.cents)}
            </span>
          </li>
        ))}
        {resto > 0 && (
          <li className="flex justify-between text-xs text-muted-foreground">
            <span>Outras</span>
            <span className="font-mono tabular">{formatCents(resto)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
