"use client";

import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCents, formatCompacto } from "@/lib/money";

export interface SerieBarra {
  nome: string;
  cor: string;
}

export interface GrupoBarra {
  label: string;
  valores: number[]; // um por série, em centavos
  destaque?: boolean;
}

const EIXO = { fontSize: 11, fill: "#6b6885" };

export function BarChart({
  series,
  dados,
  altura = 220,
  className,
}: {
  series: SerieBarra[];
  dados: GrupoBarra[];
  altura?: number;
  className?: string;
}) {
  const linhas = dados.map((d) => ({
    label: d.label,
    destaque: d.destaque,
    ...Object.fromEntries(series.map((s, i) => [s.nome, d.valores[i] ?? 0])),
  }));

  return (
    <div className={className} style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={linhas} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#e7e4f8" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={EIXO} tickLine={false} axisLine={{ stroke: "#e7e4f8" }} interval="preserveStartEnd" />
          <YAxis tick={EIXO} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompacto(v)} />
          <Tooltip
            cursor={{ fill: "#edebfb", opacity: 0.6 }}
            formatter={(v) => formatCents(Number(v))}
            contentStyle={{ borderRadius: 10, border: "1px solid #e7e4f8", fontSize: 12 }}
          />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s) => (
            <Bar key={s.nome} dataKey={s.nome} fill={s.cor} radius={[4, 4, 0, 0]} maxBarSize={28}>
              {linhas.map((l, i) => (
                <Cell key={i} fillOpacity={l.destaque ? 1 : 0.85} />
              ))}
            </Bar>
          ))}
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legenda({ itens }: { itens: { nome: string; cor: string }[] }) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {itens.map((i) => (
        <span key={i.nome} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: i.cor }} />
          {i.nome}
        </span>
      ))}
    </div>
  );
}
