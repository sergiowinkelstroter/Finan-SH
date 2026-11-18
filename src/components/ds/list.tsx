import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Card que agrupa linhas com divisória (lista de transações estilo app de banco). */
export function ListCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <Card className={cn("divide-y divide-border/60 overflow-hidden", className)}>{children}</Card>;
}

/**
 * Linha padrão: [leading] título/subtítulo ........ [trailing] [ações]
 * `leading` costuma ser um IconBubble/CategoriaIcone; `trailing`, o valor.
 */
export function ListItem({
  leading,
  titulo,
  subtitulo,
  trailing,
  acoes,
  className,
  muted,
}: {
  leading?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  trailing?: React.ReactNode;
  acoes?: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", muted && "opacity-60", className)}>
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate font-medium text-foreground">{titulo}</div>
        {subtitulo && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{subtitulo}</div>
        )}
      </div>
      {trailing && <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">{trailing}</div>}
      {acoes && <div className="-mr-2 flex shrink-0 items-center">{acoes}</div>}
    </div>
  );
}

/** Rótulo de seção acima de uma lista ("Hoje", "Fixas", …) com total opcional à direita. */
export function SectionLabel({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span>{children}</span>
      {extra && <span className="font-mono normal-case tracking-normal tabular">{extra}</span>}
    </div>
  );
}
