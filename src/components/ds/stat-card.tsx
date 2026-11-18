import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconBubble } from "./icon-bubble";
import { cn } from "@/lib/utils";

/** KPI: ícone, rótulo, valor e uma linha de apoio. Use em grids de 2 (celular) / 4 (desktop). */
export function StatCard({
  icon,
  cor,
  titulo,
  valor,
  detalhe,
  tom,
  className,
}: {
  icon: LucideIcon;
  cor?: string;
  titulo: React.ReactNode;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  /** Cor semântica do valor. */
  tom?: "positivo" | "negativo" | "neutro";
  className?: string;
}) {
  return (
    <Card className={cn("@container flex min-w-0 flex-col gap-2.5 p-3.5 sm:p-4", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <IconBubble icon={icon} cor={cor} size="sm" />
        <span className="min-w-0 flex-1 break-words text-xs font-medium leading-tight text-muted-foreground">{titulo}</span>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "num-fit font-mono font-semibold tabular",
            tom === "positivo" ? "text-menta" : tom === "negativo" ? "text-rosa" : "text-tinta",
          )}
        >
          {valor}
        </p>
        {detalhe && <div className="mt-0.5 text-xs text-muted-foreground">{detalhe}</div>}
      </div>
    </Card>
  );
}
