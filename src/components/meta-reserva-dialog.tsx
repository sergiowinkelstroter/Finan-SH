"use client";

import { useState, useTransition } from "react";
import { Target } from "lucide-react";
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
import { definirMetaReserva } from "@/server/reserva-actions";

export function MetaReservaDialog({
  metaCents,
  prazo,
}: {
  metaCents: number;
  prazo: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(metaCents ? formatCentsSemSimbolo(metaCents) : "");
  const [prazoMes, setPrazoMes] = useState(prazo ?? "");
  const [pending, startTransition] = useTransition();

  function salvar(remover = false) {
    startTransition(async () => {
      try {
        await definirMetaReserva({
          metaCents: remover ? 0 : parseReaisParaCents(valor),
          prazo: remover ? null : prazoMes || null,
        });
        toast.success(remover ? "Meta removida." : "Meta salva.");
        if (remover) {
          setValor("");
          setPrazoMes("");
        }
        setOpen(false);
      } catch {
        toast.error("Não deu para salvar.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={metaCents ? "ghost" : "secondary"} size="sm">
          <Target /> {metaCents ? "Editar meta" : "Definir meta"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Meta da reserva</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="meta">Quanto vocês querem juntar</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
              <Input
                id="meta"
                inputMode="decimal"
                autoFocus
                className="pl-9 font-mono tabular"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prazo">Até quando (opcional)</Label>
            <Input id="prazo" type="month" value={prazoMes} onChange={(e) => setPrazoMes(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Com prazo, o app calcula quanto guardar por mês para chegar lá.
            </p>
          </div>
          <DialogFooter className="gap-2">
            {metaCents > 0 && (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => salvar(true)}>
                Remover meta
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
