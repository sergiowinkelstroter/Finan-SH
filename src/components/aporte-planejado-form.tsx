"use client";

import { useState, useTransition } from "react";
import { PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { definirAportePlanejado } from "@/server/reserva-actions";

/** Quanto o casal planeja guardar todo mês — vira uma saída fixa na projeção e na planilha. */
export function AportePlanejadoForm({ valorCents }: { valorCents: number }) {
  const [valor, setValor] = useState(formatCentsSemSimbolo(valorCents));
  const [pending, start] = useTransition();
  const cents = parseReaisParaCents(valor);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          try {
            await definirAportePlanejado(cents);
            toast.success("Meta mensal de reserva salva.");
          } catch {
            toast.error("Não deu para salvar.");
          }
        });
      }}
    >
      <label htmlFor="aporte-planejado" className="flex items-center gap-2 text-sm font-medium text-foreground">
        <PiggyBank className="size-4 text-menta" /> Guardar por mês
      </label>
      <div className="flex gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
          <Input
            id="aporte-planejado"
            inputMode="decimal"
            className="w-36 pl-9 font-mono tabular"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending || cents === valorCents}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
