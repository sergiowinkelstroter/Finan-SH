import type { LucideIcon } from "lucide-react";

/** Cabeçalho padrão das telas: ícone em pílula, título, subtítulo e ações. */
export function PageHeader({
  icon: Icon,
  titulo,
  subtitulo,
  acoes,
}: {
  icon?: LucideIcon;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violeta/10 text-violeta">
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold text-foreground lg:text-2xl">{titulo}</h1>
          {subtitulo && <p className="text-sm text-muted-foreground">{subtitulo}</p>}
        </div>
      </div>
      {acoes}
    </div>
  );
}
