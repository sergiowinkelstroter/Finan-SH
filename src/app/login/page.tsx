"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Finanças do casal
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Digite a senha para entrar.
        </p>

        <form action={formAction} className="mt-8 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              autoFocus
              autoComplete="current-password"
              required
            />
          </div>

          {state.erro && (
            <p className="text-sm font-medium text-destructive">{state.erro}</p>
          )}

          <Button type="submit" size="lg" disabled={pending} className="mt-2">
            {pending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}
