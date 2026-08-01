"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { definirTeto, definirTetoPadrao } from "@/server/orcamento-actions";

export function TetoFormDialog({
  competencia,
  tetoAtualCents,
}: {
  competencia: string;
  tetoAtualCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(formatCentsSemSimbolo(tetoAtualCents));
  const [comoPadrao, setComoPadrao] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tetoCents = parseReaisParaCents(valor);

    startTransition(async () => {
      try {
        await definirTeto({ competencia, tetoCents });
        if (comoPadrao) {
          await definirTetoPadrao(tetoCents);
        }
        toast.success("Teto atualizado.");
        setOpen(false);
      } catch {
        toast.error("Não deu para salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Editar teto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teto do mês</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="teto">Valor</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="teto"
                inputMode="decimal"
                autoFocus
                className="pl-9 font-mono tabular"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input accent-violeta"
              checked={comoPadrao}
              onChange={(e) => setComoPadrao(e.target.checked)}
            />
            Usar como padrão para os próximos meses
          </label>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
