"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CreditCard,
  Home,
  Layers,
  Menu,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
  LineChart,
  LogOut,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { logout, trocarPerfil } from "@/server/auth-actions";

const primaryTabs = [
  { href: "/", label: "Início", icon: Home },
  { href: "/faturas", label: "Faturas", icon: CreditCard },
  { href: "/parcelas", label: "Parcelas", icon: Layers },
  { href: "/reserva", label: "Reserva", icon: PiggyBank },
];

const maisLinks = [
  { href: "/cartoes", label: "Cartões", icon: Wallet },
  { href: "/entradas", label: "Entradas", icon: TrendingUp },
  { href: "/saidas", label: "Saídas", icon: Receipt },
  { href: "/projecao", label: "Projeção", icon: LineChart },
];

export function BottomNav({ perfil }: { perfil: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const emMais = maisLinks.some((l) => pathname.startsWith(l.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-stretch">
        {primaryTabs.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-violeta" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
              {tab.label}
            </Link>
          );
        })}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                emMais ? "text-violeta" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Menu className="size-5" strokeWidth={emMais ? 2.4 : 2} />
              Mais
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-8">
            <SheetHeader>
              <SheetTitle>Mais</SheetTitle>
            </SheetHeader>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {maisLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex flex-col items-start gap-2 rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent"
                  >
                    <Icon className="size-5 text-violeta" />
                    <span className="text-sm font-medium text-foreground">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserRound className="size-4" />
                {perfil ?? "—"}
              </div>
              <form action={trocarPerfil}>
                <button
                  type="submit"
                  className="text-sm font-medium text-violeta hover:underline"
                >
                  Trocar perfil
                </button>
              </form>
              <form action={logout}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm font-medium text-rosa hover:underline"
                >
                  <LogOut className="size-4" />
                  Sair
                </button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
