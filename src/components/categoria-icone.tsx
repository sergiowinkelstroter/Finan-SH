import { createElement } from "react";
import type { LucideIcon } from "lucide-react";
import { corCategoria } from "@/lib/categorias";
import { iconeCategoria } from "@/lib/categoria-icones";
import { cn } from "@/lib/utils";

/** Ícone da categoria num círculo com a cor dela (padrão de app de banco). */
export function CategoriaIcone({
  nome,
  cor,
  icon,
  size = "md",
  className,
}: {
  nome: string | null | undefined;
  cor?: string;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const c = cor ?? corCategoria(nome ?? "Sem categoria");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "sm" && "size-7 [&_svg]:size-3.5",
        size === "md" && "size-10 [&_svg]:size-[18px]",
        size === "lg" && "size-12 [&_svg]:size-5",
        className,
      )}
      style={{ background: `${c}1f`, color: c }}
      aria-hidden
    >
      {createElement(icon ?? iconeCategoria(nome), { strokeWidth: 2.2 })}
    </span>
  );
}
