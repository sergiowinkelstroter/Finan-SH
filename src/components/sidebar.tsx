"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserRound, Wallet2 } from "lucide-react";
import { ativo, GRUPOS_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { logout, trocarPerfil } from "@/server/auth-actions";

/** Navegação lateral fixa para notebook e desktop (lg+). */
export function Sidebar({ perfil }: { perfil: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-violeta text-white">
          <Wallet2 className="size-5" />
        </span>
        <span className="font-display text-lg font-semibold text-foreground">Finanças</span>
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4">
        {GRUPOS_NAV.map((g) => (
          <div key={g.titulo} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {g.titulo}
            </p>
            {g.itens.map((item) => {
              const on = ativo(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    on ? "bg-secondary text-violeta" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-[18px]" strokeWidth={on ? 2.4 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border p-4 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <UserRound className="size-4" />
          <span className="flex-1 truncate">{perfil ?? "—"}</span>
        </div>
        <form action={trocarPerfil}>
          <button type="submit" className="font-medium text-violeta hover:underline">
            Trocar perfil
          </button>
        </form>
        <form action={logout}>
          <button type="submit" className="flex items-center gap-1.5 font-medium text-rosa hover:underline">
            <LogOut className="size-4" /> Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
