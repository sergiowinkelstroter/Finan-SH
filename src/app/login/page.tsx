"use client";

import { useActionState } from "react";
import { AlertCircle, Lock, PiggyBank, Table2, Wallet2, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

const DESTAQUES = [
  { icon: Workflow, texto: "Para onde vai o dinheiro" },
  { icon: Table2, texto: "Planilha do futuro" },
  { icon: PiggyBank, texto: "Reserva do casal" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-background lg:flex-row">
      <section className="bg-hero relative overflow-hidden px-6 pb-16 pt-14 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-16 lg:pb-14">
        <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-white/5" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-sm flex-col gap-5 lg:mx-0 lg:max-w-md">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <Wallet2 className="size-7" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight lg:text-4xl">Finanças do casal</h1>
            <p className="mt-2 text-white/80">Faturas, parcelas, teto de gastos e reserva — a dois.</p>
          </div>
          <ul className="hidden flex-col gap-3 lg:flex">
            {DESTAQUES.map((d) => (
              <li key={d.texto} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/15">
                  <d.icon className="size-4" />
                </span>
                {d.texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative -mt-8 flex flex-1 justify-center px-4 pb-10 lg:mt-0 lg:items-center lg:px-16">
        <div className="w-full max-w-sm rounded-[28px] border border-border/70 bg-card p-6 shadow-card sm:p-8 lg:border-0 lg:bg-transparent lg:shadow-none">
          <h2 className="font-display text-xl font-semibold text-foreground">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">Digite a senha do casal para continuar.</p>

          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  required
                  className="h-12 pl-10 text-base"
                />
              </div>
            </div>

            {state.erro && (
              <p className="flex items-center gap-2 rounded-xl bg-rosa/10 px-3 py-2 text-sm font-medium text-rosa">
                <AlertCircle className="size-4 shrink-0" /> {state.erro}
              </p>
            )}

            <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
