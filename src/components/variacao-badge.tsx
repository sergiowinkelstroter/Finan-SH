import { formatPercentual } from "@/lib/money";

/** Seta e % de variação. `inverso`: subir é ruim (gastos). */
export function VariacaoBadge({
  valor,
  inverso = true,
  sufixo = "vs. período anterior",
}: {
  valor: number | null;
  inverso?: boolean;
  sufixo?: string;
}) {
  if (valor == null) return <span className="text-xs text-muted-foreground">sem base de comparação</span>;
  if (Math.abs(valor) < 0.005) return <span className="text-xs text-muted-foreground">igual ao anterior</span>;
  const subiu = valor > 0;
  const ruim = inverso ? subiu : !subiu;
  return (
    <span className={`text-xs font-medium ${ruim ? "text-rosa" : "text-menta"}`}>
      {subiu ? "▲" : "▼"} {formatPercentual(Math.abs(valor))}{" "}
      <span className="font-normal text-muted-foreground">{sufixo}</span>
    </span>
  );
}
