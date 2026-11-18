import type { LucideIcon } from "lucide-react";
import { IconBubble } from "./icon-bubble";
import { cn } from "@/lib/utils";

/** Estado vazio: ícone grande, título, texto e ação opcional. */
export function EmptyState({
  icon,
  titulo,
  descricao,
  acao,
  className,
}: {
  icon: LucideIcon;
  titulo: string;
  descricao?: React.ReactNode;
  acao?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border bg-card/60 px-6 py-10 text-center",
        className,
      )}
    >
      <IconBubble icon={icon} size="lg" />
      <div className="flex max-w-sm flex-col gap-1">
        <p className="font-display text-base font-semibold text-foreground">{titulo}</p>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </div>
      {acao}
    </div>
  );
}
