import { formatCents } from "@/lib/money";

export interface ItemHBar {
  nome: string;
  cents: number;
  cor: string;
  /** Valor do período anterior, para mostrar variação. */
  anteriorCents?: number;
}

/** Barras horizontais com valor e variação — boa para ranking de categorias. */
export function HBarList({ itens }: { itens: ItemHBar[] }) {
  const max = Math.max(1, ...itens.map((i) => i.cents));
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((i) => {
        const delta =
          i.anteriorCents != null && i.anteriorCents > 0
            ? (i.cents - i.anteriorCents) / i.anteriorCents
            : null;
        return (
          <li key={i.nome} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate text-foreground">{i.nome}</span>
              <span className="flex shrink-0 items-baseline gap-2">
                {delta != null && Math.abs(delta) >= 0.01 && (
                  <span className={`text-xs ${delta > 0 ? "text-rosa" : "text-menta"}`}>
                    {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%
                  </span>
                )}
                <span className="font-mono tabular text-tinta">{formatCents(i.cents)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${(i.cents / max) * 100}%`, background: i.cor }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
