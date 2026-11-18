import { CategoriaIcone } from "@/components/categoria-icone";
import { formatCents } from "@/lib/money";

export interface ItemHBar {
  nome: string;
  cents: number;
  cor: string;
  /** Valor do período anterior, para mostrar variação. */
  anteriorCents?: number;
}

/** Barras horizontais com ícone, valor e variação — boa para ranking de categorias. */
export function HBarList({ itens }: { itens: ItemHBar[] }) {
  const max = Math.max(1, ...itens.map((i) => i.cents));
  return (
    <ul className="flex flex-col gap-3.5">
      {itens.map((i) => {
        const delta =
          i.anteriorCents != null && i.anteriorCents > 0
            ? (i.cents - i.anteriorCents) / i.anteriorCents
            : null;
        return (
          <li key={i.nome} className="flex items-center gap-3">
            <CategoriaIcone nome={i.nome} cor={i.cor} size="sm" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">{i.nome}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  {delta != null && Math.abs(delta) >= 0.01 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        delta > 0 ? "bg-rosa/10 text-rosa" : "bg-menta/10 text-menta"
                      }`}
                    >
                      {delta > 0 ? "▲" : "▼"} {Math.abs(Math.round(delta * 100))}%
                    </span>
                  )}
                  <span className="font-mono tabular text-tinta">{formatCents(i.cents)}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${(i.cents / max) * 100}%`, background: i.cor }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
