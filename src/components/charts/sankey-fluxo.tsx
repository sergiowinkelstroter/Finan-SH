"use client";

import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { formatCents, formatCompacto } from "@/lib/money";

export interface FluxoCategoria {
  nome: string;
  cor: string;
  cartaoCents: number;
  saidasCents: number;
}

const COR = {
  entradas: "#0ea88c",
  deficit: "#e2496b",
  cartoes: "#6c4cf0",
  saidas: "#2e6be6",
  reserva: "#10b981",
  livre: "#a8a6bd",
  outras: "#94a3b8",
};

/**
 * Sankey "para onde vai o dinheiro": Entradas → (Cartões, Saídas, Reserva, Livre) → categorias.
 * Se gastou mais do que entrou, um nó "Déficit" completa o lado esquerdo.
 */
export function SankeyFluxo({
  entradasCents,
  reservaCents,
  categorias,
  maxCategorias = 7,
  altura = 380,
}: {
  entradasCents: number;
  reservaCents: number;
  categorias: FluxoCategoria[];
  maxCategorias?: number;
  altura?: number;
}) {
  const top = categorias.slice(0, maxCategorias);
  const resto = categorias.slice(maxCategorias);
  const cats: FluxoCategoria[] = resto.length
    ? [
        ...top,
        {
          nome: "Outras",
          cor: COR.outras,
          cartaoCents: resto.reduce((s, c) => s + c.cartaoCents, 0),
          saidasCents: resto.reduce((s, c) => s + c.saidasCents, 0),
        },
      ]
    : top;

  const cartao = cats.reduce((s, c) => s + c.cartaoCents, 0);
  const saidas = cats.reduce((s, c) => s + c.saidasCents, 0);
  const reserva = Math.max(0, reservaCents);
  const usado = cartao + saidas + reserva;
  const livre = Math.max(0, entradasCents - usado);
  const deficit = Math.max(0, usado - entradasCents);

  if (usado + livre <= 0) {
    return <p className="text-sm text-muted-foreground">Sem movimentação no período.</p>;
  }

  type No = { name: string; cor: string };
  const nodes: No[] = [];
  const idx = (name: string, cor: string) => {
    let i = nodes.findIndex((n) => n.name === name);
    if (i < 0) {
      nodes.push({ name, cor });
      i = nodes.length - 1;
    }
    return i;
  };
  const links: { source: number; target: number; value: number }[] = [];
  const link = (a: number, b: number, v: number) => {
    if (v > 0) links.push({ source: a, target: b, value: v });
  };

  const iEntradas = idx("Entradas", COR.entradas);
  const iDeficit = deficit > 0 ? idx("Déficit", COR.deficit) : -1;
  const meio: [string, string, number][] = [
    ["Cartões", COR.cartoes, cartao],
    ["Saídas avulsas", COR.saidas, saidas],
    ["Reserva", COR.reserva, reserva],
    ["Livre", COR.livre, livre],
  ];
  const totalMeio = meio.reduce((s, m) => s + m[2], 0);
  const meioIdx = new Map<string, number>();
  for (const [nome, cor, v] of meio) {
    if (v <= 0) continue;
    const i = idx(nome, cor);
    meioIdx.set(nome, i);
    if (iDeficit >= 0) {
      const parteDeficit = Math.round((v * deficit) / totalMeio);
      link(iEntradas, i, v - parteDeficit);
      link(iDeficit, i, parteDeficit);
    } else {
      link(iEntradas, i, v);
    }
  }
  for (const c of cats) {
    const i = idx(c.nome, c.cor);
    if (meioIdx.has("Cartões")) link(meioIdx.get("Cartões")!, i, c.cartaoCents);
    if (meioIdx.has("Saídas avulsas")) link(meioIdx.get("Saídas avulsas")!, i, c.saidasCents);
  }

  const total = Math.max(entradasCents, usado);

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <div style={{ minWidth: 560, height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={{ nodes, links }}
            nodePadding={14}
            nodeWidth={10}
            margin={{ top: 8, right: 150, bottom: 8, left: 8 }}
            node={(props: NoProps) => <NoSankey {...props} nodes={nodes} total={total} />}
            link={(props: LinkProps) => <LinkSankey {...props} nodes={nodes} />}
          >
            <Tooltip
              formatter={(v) => formatCents(Number(v))}
              contentStyle={{ borderRadius: 10, border: "1px solid #e7e4f8", fontSize: 12 }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

type NoProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: { name: string; value: number; depth?: number };
};

function NoSankey({ x, y, width, height, index, payload, nodes, total }: NoProps & { nodes: { cor: string }[]; total: number }) {
  const cor = nodes[index]?.cor ?? "#999";
  const pct = total > 0 ? Math.round((payload.value / total) * 100) : 0;
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(2, height)} rx={3} fill={cor} />
      <text x={x + width + 6} y={y + height / 2 - 2} fontSize={12} fill="#1a1830" dominantBaseline="middle" fontWeight={600}>
        {payload.name}
      </text>
      <text x={x + width + 6} y={y + height / 2 + 12} fontSize={11} fill="#6b6885" dominantBaseline="middle">
        R$ {formatCompacto(payload.value)} · {pct}%
      </text>
    </g>
  );
}

type LinkProps = {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  payload: { target: { name: string } | number };
};

function LinkSankey({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  payload,
  nodes,
}: LinkProps & { nodes: { name: string; cor: string }[] }) {
  const alvo = typeof payload.target === "number" ? nodes[payload.target] : nodes.find((n) => n.name === (payload.target as { name: string }).name);
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={alvo?.cor ?? "#c9c3f5"}
      strokeOpacity={0.28}
      strokeWidth={Math.max(1, linkWidth)}
    />
  );
}
