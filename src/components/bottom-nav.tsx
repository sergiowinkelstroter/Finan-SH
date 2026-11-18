"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu, Plus, UserRound } from "lucide-react";
import { ABAS_MOBILE, ativo, GRUPOS_NAV, ROTULO_CURTO, TODOS_ITENS } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ACOES, DialogsAcoes, type Acao, type DadosAcoes } from "@/components/acoes-rapidas";
import { logout, trocarPerfil } from "@/server/auth-actions";

const tabs = ABAS_MOBILE.map((href) => TODOS_ITENS.find((i) => i.href === href)!);

export function BottomNav({ perfil, dados }: { perfil: string | null; dados: DadosAcoes }) {
  const pathname = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const [novoAberto, setNovoAberto] = useState(false);
  const [acao, setAcao] = useState<Acao | null>(null);

  const emMais = !ABAS_MOBILE.some((h) => ativo(pathname, h));

  const tab = (href: string) => {
    const item = tabs.find((t) => t.href === href)!;
    const on = ativo(pathname, href);
    const Icon = item.icon;
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
          on ? "text-violeta" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", on && "bg-violeta/10")}>
          <Icon className="size-5" strokeWidth={on ? 2.4 : 2} />
        </span>
        {ROTULO_CURTO[href] ?? item.label}
      </Link>
    );
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-5 items-end">
          {tab(ABAS_MOBILE[0])}
          {tab(ABAS_MOBILE[1])}

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setNovoAberto(true)}
              aria-label="Novo lançamento"
              className="-mt-6 mb-2 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-violeta to-azul text-white shadow-lg shadow-violeta/30 ring-4 ring-background transition-transform active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.5} />
            </button>
          </div>

          {tab(ABAS_MOBILE[2])}

          <Sheet open={maisAberto} onOpenChange={setMaisAberto}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  emMais ? "text-violeta" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", emMais && "bg-violeta/10")}>
                  <Menu className="size-5" strokeWidth={emMais ? 2.4 : 2} />
                </span>
                Mais
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl pb-8">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-2 flex flex-col gap-5">
                {GRUPOS_NAV.map((g) => (
                  <div key={g.titulo}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.titulo}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {g.itens.map((link) => {
                        const Icon = link.icon;
                        const on = ativo(pathname, link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMaisAberto(false)}
                            className={cn(
                              "flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors",
                              on ? "border-violeta/40 bg-violeta/5" : "border-border bg-background hover:bg-accent",
                            )}
                          >
                            <span className="flex size-10 items-center justify-center rounded-full bg-violeta/10 text-violeta">
                              <Icon className="size-5" />
                            </span>
                            <span className="text-xs font-medium leading-tight text-foreground">{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserRound className="size-4" />
                  {perfil ?? "—"}
                </span>
                <div className="flex items-center gap-4">
                  <form action={trocarPerfil}>
                    <button type="submit" className="text-sm font-medium text-violeta hover:underline">
                      Trocar perfil
                    </button>
                  </form>
                  <form action={logout}>
                    <button type="submit" className="flex items-center gap-1.5 text-sm font-medium text-rosa hover:underline">
                      <LogOut className="size-4" /> Sair
                    </button>
                  </form>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <Sheet open={novoAberto} onOpenChange={setNovoAberto}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader>
            <SheetTitle>O que você quer lançar?</SheetTitle>
          </SheetHeader>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {ACOES.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setNovoAberto(false);
                    setAcao(a.id);
                  }}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-background p-4 text-left transition-colors hover:bg-accent"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-full"
                    style={{ background: `${a.cor}1f`, color: a.cor }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="font-semibold text-foreground">{a.label}</span>
                  <span className="text-xs text-muted-foreground">{a.descricao}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <DialogsAcoes dados={dados} acao={acao} onClose={() => setAcao(null)} />
    </>
  );
}
