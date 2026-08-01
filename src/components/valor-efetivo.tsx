import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import type { TipoValor } from "@/lib/calculos";
import { cn } from "@/lib/utils";

export function ValorEfetivo({
  valorCents,
  tipo,
  diasDesdeAtualizacao,
  className,
}: {
  valorCents: number;
  tipo: TipoValor;
  diasDesdeAtualizacao?: number | null;
  className?: string;
}) {
  const desatualizado =
    tipo === "parcial" && diasDesdeAtualizacao != null && diasDesdeAtualizacao > 5;

  return (
    <span className={cn("inline-flex flex-wrap items-center justify-end gap-1.5", className)}>
      <span
        className={cn(
          "font-mono tabular",
          tipo === "estimado" ? "text-bruma" : "text-tinta",
        )}
      >
        {tipo === "estimado" ? "~" : ""}
        {formatCents(valorCents)}
      </span>
      {tipo === "parcial" && (
        <Badge variant="info" className="font-sans">
          parcial{desatualizado ? ` · há ${diasDesdeAtualizacao}d` : ""}
        </Badge>
      )}
    </span>
  );
}
