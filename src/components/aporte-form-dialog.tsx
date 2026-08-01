"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { hojeISO } from "@/lib/dates";
import { parseReaisParaCents } from "@/lib/money";
import { registrarAporte } from "@/server/reserva-actions";

export function AporteFormDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [tipo, setTipo] = useState<"aporte" | "resgate">("aporte");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState("");

  function reset() {
    setTipo("aporte");
    setValor("");
    setData(hojeISO());
    setDescricao("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseReaisParaCents(valor);

    startTransition(async () => {
      try {
        await registrarAporte({
          data,
          valorCents: tipo === "resgate" ? -Math.abs(cents) : Math.abs(cents),
          descricao: descricao || null,
        });
        toast.success(tipo === "aporte" ? "Aporte registrado." : "Resgate registrado.");
        setOpen(false);
        reset();
      } catch {
        toast.error("Não deu para salvar. Confira os campos.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Novo lançamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aporte ou resgate</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "aporte" | "resgate")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aporte">Aporte</SelectItem>
                  <SelectItem value="resgate">Resgate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valor"
                  inputMode="decimal"
                  className="pl-9 font-mono tabular"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data">Data</Label>
            <Input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="13º, rendimento, emergência…"
            />
          </div>

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
