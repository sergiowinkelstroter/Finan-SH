import { createElement } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícone num círculo tingido com a própria cor — bloco básico das listas e cards. */
export function IconBubble({
  icon,
  cor = "#6c4cf0",
  size = "md",
  shape = "circle",
  solid = false,
  className,
}: {
  icon: LucideIcon;
  cor?: string;
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        shape === "circle" ? "rounded-full" : "rounded-xl",
        size === "sm" && "size-8 [&_svg]:size-4",
        size === "md" && "size-10 [&_svg]:size-[18px]",
        size === "lg" && "size-12 [&_svg]:size-5",
        className,
      )}
      style={solid ? { background: cor, color: "#fff" } : { background: `${cor}1f`, color: cor }}
    >
      {createElement(icon, { strokeWidth: 2.2 })}
    </span>
  );
}
