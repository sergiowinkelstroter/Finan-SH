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

const EIXO = { fontSize: 11, fill: "#8b88a3" };

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
        <RBarChart data={linhas} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} barGap={3} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#efedf9" />
          <XAxis dataKey="label" tick={EIXO} tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
          <YAxis tick={EIXO} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => formatCompacto(v)} />
          <Tooltip
            cursor={{ fill: "#6c4cf0", opacity: 0.06, radius: 8 } as object}
            formatter={(v) => formatCents(Number(v))}
            contentStyle={{ borderRadius: 14, border: "none", boxShadow: "0 8px 24px -6px rgb(26 24 48 / 0.18)", fontSize: 12, padding: "8px 12px" }}
            labelStyle={{ fontWeight: 600, color: "#1a1830", marginBottom: 2, textTransform: "capitalize" }}
          />
          {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
          {series.map((s) => (
            <Bar key={s.nome} dataKey={s.nome} fill={s.cor} radius={[6, 6, 6, 6]} maxBarSize={22}>
              {linhas.map((l, i) => (
                <Cell key={i} fillOpacity={l.destaque || !linhas.some((x) => x.destaque) ? 1 : 0.55} />
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
          <span className="size-2.5 rounded-full" style={{ background: i.cor }} />
          {i.nome}
        </span>
      ))}
    </div>
  );
}
