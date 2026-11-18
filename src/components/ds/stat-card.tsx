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
    <Card className={cn("flex flex-col gap-3 p-4", className)}>
      <div className="flex items-center gap-2">
        <IconBubble icon={icon} cor={cor} size="sm" />
        <span className="text-xs font-medium text-muted-foreground">{titulo}</span>
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-mono text-lg font-semibold tabular lg:text-xl",
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
