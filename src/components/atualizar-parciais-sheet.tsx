"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { atualizarParciaisEmLote } from "@/server/faturas-actions";
import type { FaturaEfetiva } from "@/server/faturas";

export function AtualizarParciaisSheet({
  faturas,
  competencia,
}: {
  faturas: FaturaEfetiva[];
  competencia: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      faturas.map((f) => [
        f.card.id,
        f.invoice?.valorParcialCents
          ? formatCentsSemSimbolo(f.invoice.valorParcialCents)
          : "",
      ]),
    ),
  );

  function handleSalvar() {
    const itens = faturas
      .filter((f) => f.invoice?.status !== "fechada" && f.invoice?.status !== "paga")
      .map((f) => ({
        cardId: f.card.id,
        valorParcialCents: parseReaisParaCents(valores[f.card.id] ?? "0"),
      }));

    startTransition(async () => {
      try {
        await atualizarParciaisEmLote({ competencia, itens });
        toast.success("Faturas atualizadas.");
        setOpen(false);
      } catch {
        toast.error("Não deu para salvar. Tenta de novo.");
      }
    });
  }

  const editaveis = faturas.filter(
    (f) => f.invoice?.status !== "fechada" && f.invoice?.status !== "paga",
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" className="w-full">
          Atualizar
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-8">
        <SheetHeader>
          <SheetTitle>Atualizar faturas</SheetTitle>
        </SheetHeader>

        {editaveis.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Todas as faturas deste mês já estão fechadas.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-4">
            {editaveis.map((f) => (
              <div key={f.card.id} className="flex flex-col gap-1.5">
                <Label htmlFor={`parcial-${f.card.id}`}>{f.card.nome}</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id={`parcial-${f.card.id}`}
                    inputMode="decimal"
                    placeholder="0,00"
                    className="pl-9 font-mono tabular"
                    value={valores[f.card.id] ?? ""}
                    onChange={(e) =>
                      setValores((prev) => ({ ...prev, [f.card.id]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <SheetFooter>
          <Button onClick={handleSalvar} disabled={pending || editaveis.length === 0}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
