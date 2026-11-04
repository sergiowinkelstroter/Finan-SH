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
import { CategoriaInput, CheckCompartilhada } from "@/components/categoria-input";
import { hojeISO } from "@/lib/dates";
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { salvarSaida } from "@/server/saidas-actions";

type Usuario = { id: number; nome: string };

type SaidaExistente = {
  id: number;
  descricao: string;
  valorCents: number;
  data: string;
  categoria: string | null;
  pagoPor: number | null;
  compartilhada?: boolean;
};

export function SaidaFormDialog({
  usuarios,
  saida,
  trigger,
  categorias = [],
}: {
  categorias?: string[];
  usuarios: Usuario[];
  saida?: SaidaExistente;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [descricao, setDescricao] = useState(saida?.descricao ?? "");
  const [valor, setValor] = useState(saida ? formatCentsSemSimbolo(saida.valorCents) : "");
  const [data, setData] = useState(saida?.data ?? hojeISO());
  const [categoria, setCategoria] = useState(saida?.categoria ?? "");
  const [pagoPor, setPagoPor] = useState(saida?.pagoPor ? String(saida.pagoPor) : "none");
  const [compartilhada, setCompartilhada] = useState(saida?.compartilhada ?? true);

  function reset() {
    setDescricao("");
    setValor("");
    setData(hojeISO());
    setCategoria("");
    setPagoPor("none");
    setCompartilhada(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await salvarSaida({
          id: saida?.id,
          descricao,
          valorCents: parseReaisParaCents(valor),
          data,
          categoria: categoria || null,
          pagoPor: pagoPor === "none" ? null : Number(pagoPor),
          compartilhada,
        });
        toast.success("Saída salva.");
        setOpen(false);
        if (!saida) reset();
      } catch {
        toast.error("Não deu para salvar. Confira os campos.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus /> Nova saída
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{saida ? "Editar saída" : "Nova saída"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Aluguel, condomínio, mercado…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Categoria (opcional)</Label>
              <CategoriaInput id="categoria" value={categoria} onChange={setCategoria} sugestoes={categorias} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Pago por</Label>
              <Select value={pagoPor} onValueChange={setPagoPor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informar</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <CheckCompartilhada checked={compartilhada} onChange={setCompartilhada} />

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
