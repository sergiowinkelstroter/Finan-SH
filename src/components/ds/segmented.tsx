import Link from "next/link";
import { cn } from "@/lib/utils";

/** Controle segmentado em pílula, com links (estado na URL). */
export function SegmentedLinks({
  opcoes,
  ativo,
  className,
}: {
  opcoes: { valor: string; label: React.ReactNode; href: string }[];
  ativo: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex gap-1 rounded-full bg-muted p-1 text-sm font-medium", className)}>
      {opcoes.map((o) => (
        <Link
          key={o.valor}
          href={o.href}
          scroll={false}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-center transition-colors",
            o.valor === ativo ? "bg-card text-violeta shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
