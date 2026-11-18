"use client";

import { useState, useTransition } from "react";
import { Flag, FlagOff, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconBubble } from "@/components/ds";
import { formatCents, formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { definirSaldoInicial, marcarSaldoInicial } from "@/server/reserva-actions";

/** Saldo que a reserva já tinha antes do app: entra no saldo, não nas saídas. */
export function SaldoInicialReserva({
  atual,
  hoje,
}: {
  atual: { valorCents: number; data: string } | null;
  hoje: string;
}) {
  const [editando, setEditando] = useState(!atual);
  const [valor, setValor] = useState(atual ? formatCentsSemSimbolo(atual.valorCents) : "");
  const [data, setData] = useState(atual?.data ?? hoje);
  const [pending, start] = useTransition();

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      try {
        await definirSaldoInicial({ valorCents: parseReaisParaCents(valor), data });
        toast.success("Saldo inicial salvo. Ele não conta como saída.");
        setEditando(false);
      } catch {
        toast.error("Não deu para salvar o saldo inicial.");
      }
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <IconBubble icon={Landmark} cor="#2e6be6" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Saldo inicial</p>
          <p className="text-xs text-muted-foreground">
            O que já estava guardado antes de usar o app. Soma no saldo, mas não conta como saída de nenhum mês.
          </p>
        </div>
        {atual && !editando && (
          <div className="text-right">
            <p className="whitespace-nowrap font-mono text-base font-semibold tabular text-tinta">{formatCents(atual.valorCents)}</p>
            <button type="button" onClick={() => setEditando(true)} className="text-xs font-medium text-violeta hover:underline">
              Alterar
            </button>
          </div>
        )}
      </div>

      {editando && (
        <form onSubmit={salvar} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="saldo-inicial-valor">Valor</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
              <Input
                id="saldo-inicial-valor"
                inputMode="decimal"
                className="pl-9 font-mono tabular"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="saldo-inicial-data">Em</Label>
            <Input id="saldo-inicial-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            {atual && (
              <Button type="button" variant="ghost" onClick={() => setEditando(false)} className="flex-1 sm:flex-none">
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={pending} className="flex-1 sm:flex-none">
              Salvar
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/** Alterna um lançamento entre "aporte do mês" e "saldo inicial". */
export function MarcarSaldoInicialButton({ id, inicial }: { id: number; inicial: boolean }) {
  const [pending, start] = useTransition();
  const Icon = inicial ? FlagOff : Flag;
  return (
    <button
      type="button"
      disabled={pending}
      title={inicial ? "Voltar a contar como aporte (saída do mês)" : "Marcar como saldo inicial (não conta como saída)"}
      aria-label={inicial ? "Desmarcar saldo inicial" : "Marcar como saldo inicial"}
      onClick={() =>
        start(async () => {
          try {
            await marcarSaldoInicial(id, !inicial);
            toast.success(inicial ? "Voltou a contar como saída do mês." : "Marcado como saldo inicial — não conta mais como saída.");
          } catch {
            toast.error("Não deu para alterar.");
          }
        })
      }
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-azul/10 hover:text-azul disabled:opacity-50"
    >
      <Icon className="size-4" />
    </button>
  );
}
