"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, UserRound, Wallet2 } from "lucide-react";
import { ativo, GRUPOS_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { ACOES, DialogsAcoes, type Acao, type DadosAcoes } from "@/components/acoes-rapidas";
import { logout, trocarPerfil } from "@/server/auth-actions";

/** Navegação lateral fixa para notebook e desktop (lg+). */
export function Sidebar({ perfil, dados }: { perfil: string | null; dados: DadosAcoes }) {
  const pathname = usePathname();
  const [acao, setAcao] = useState<Acao | null>(null);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violeta to-azul text-white shadow-md shadow-violeta/30">
          <Wallet2 className="size-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-display text-lg font-semibold text-foreground">Finanças</span>
          <span className="text-xs text-muted-foreground">do casal</span>
        </span>
      </div>

      <div className="mx-4 mb-4 rounded-2xl bg-muted/70 p-3">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lançar</p>
        <div className="grid grid-cols-4 gap-1.5">
          {ACOES.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                title={a.descricao}
                onClick={() => setAcao(a.id)}
                className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <span className="flex size-8 items-center justify-center rounded-full" style={{ background: `${a.cor}1f`, color: a.cor }}>
                  <Icon className="size-4" />
                </span>
                {a.label}
              </button>
            );
          })}
        </div>
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
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                    on ? "bg-violeta text-white shadow-sm shadow-violeta/30" : "text-muted-foreground hover:bg-accent hover:text-foreground",
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

      <div className="flex items-center gap-3 border-t border-border p-4 text-sm">
        <span className="flex size-9 items-center justify-center rounded-full bg-violeta/10 text-violeta">
          <UserRound className="size-4" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium text-foreground">{perfil ?? "—"}</span>
          <form action={trocarPerfil}>
            <button type="submit" className="text-xs text-violeta hover:underline">
              Trocar perfil
            </button>
          </form>
        </div>
        <form action={logout}>
          <button type="submit" aria-label="Sair" className="rounded-lg p-2 text-muted-foreground hover:bg-rosa/10 hover:text-rosa">
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
      <DialogsAcoes dados={dados} acao={acao} onClose={() => setAcao(null)} />
    </aside>
  );
}
