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
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-violeta text-white shadow-md shadow-violeta/25">
            <Wallet2 className="size-7" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Finanças do casal</h1>
            <p className="mt-1 text-sm text-muted-foreground">Faturas, parcelas, teto de gastos e reserva — a dois.</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-border/70 bg-card p-6 shadow-card sm:p-7">
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="senha">Senha do casal</Label>
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

            <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
              {pending ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        </div>

        <ul className="flex flex-wrap justify-center gap-2">
          {DESTAQUES.map((d) => (
            <li
              key={d.texto}
              className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border/70"
            >
              <d.icon className="size-3.5 text-violeta" />
              {d.texto}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
