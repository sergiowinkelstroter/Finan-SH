"use client";

import {
  Area,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents, formatCompacto } from "@/lib/money";

export interface SerieLinha {
  nome: string;
  cor: string;
  valores: number[];
  tracejada?: boolean;
}

const EIXO = { fontSize: 11, fill: "#6b6885" };

/** Primeira série como área preenchida; as demais como linhas. Linha do zero para negativos. */
export function LineChart({
  labels,
  series,
  altura = 220,
  area = true,
  className,
}: {
  labels: string[];
  series: SerieLinha[];
  altura?: number;
  area?: boolean;
  className?: string;
}) {
  const dados = labels.map((label, i) => ({
    label,
    ...Object.fromEntries(series.map((s) => [s.nome, s.valores[i] ?? 0])),
  }));
  const [primeira, ...demais] = series;
  const gid = `g-${(primeira?.cor ?? "x").replace("#", "")}`;
  const comum = (
    <>
      <CartesianGrid vertical={false} stroke="#e7e4f8" strokeDasharray="3 3" />
      <XAxis dataKey="label" tick={EIXO} tickLine={false} axisLine={{ stroke: "#e7e4f8" }} interval="preserveStartEnd" />
      <YAxis tick={EIXO} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompacto(v)} />
      <ReferenceLine y={0} stroke="#6b6885" strokeWidth={1} />
      <Tooltip
        formatter={(v) => formatCents(Number(v))}
        contentStyle={{ borderRadius: 10, border: "1px solid #e7e4f8", fontSize: 12 }}
      />
      {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
    </>
  );

  return (
    <div className={className} style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          {comum}
          {area && primeira && (
            <>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primeira.cor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={primeira.cor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey={primeira.nome} stroke={primeira.cor} strokeWidth={2} fill={`url(#${gid})`} dot={dados.length <= 14} activeDot={{ r: 5 }} />
            </>
          )}
          {(area ? demais : series).map((s) => (
            <Line key={s.nome} type="monotone" dataKey={s.nome} stroke={s.cor} strokeWidth={2} strokeDasharray={s.tracejada ? "5 4" : undefined} dot={false} activeDot={{ r: 4 }} />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
