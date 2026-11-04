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
import { salvarRecorrencia } from "@/server/recorrencias-actions";

type Usuario = { id: number; nome: string };

type RecorrenciaExistente = {
  id: number;
  descricao: string;
  valorCents: number;
  diaMes: number;
  categoria: string | null;
  pagoPor: number | null;
  compartilhada: boolean;
  inicio: string;
  fim: string | null;
  ativo: boolean;
};

export function RecorrenciaFormDialog({
  usuarios,
  recorrencia,
  trigger,
  categorias = [],
}: {
  usuarios: Usuario[];
  recorrencia?: RecorrenciaExistente;
  trigger?: React.ReactNode;
  categorias?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [descricao, setDescricao] = useState(recorrencia?.descricao ?? "");
  const [valor, setValor] = useState(recorrencia ? formatCentsSemSimbolo(recorrencia.valorCents) : "");
  const [diaMes, setDiaMes] = useState(String(recorrencia?.diaMes ?? 5));
  const [categoria, setCategoria] = useState(recorrencia?.categoria ?? "");
  const [pagoPor, setPagoPor] = useState(recorrencia?.pagoPor ? String(recorrencia.pagoPor) : "none");
  const [compartilhada, setCompartilhada] = useState(recorrencia?.compartilhada ?? true);
  const [inicio, setInicio] = useState(recorrencia?.inicio ?? hojeISO());
  const [fim, setFim] = useState(recorrencia?.fim ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await salvarRecorrencia({
          id: recorrencia?.id,
          descricao,
          valorCents: parseReaisParaCents(valor),
          diaMes: Number(diaMes),
          categoria: categoria || null,
          pagoPor: pagoPor === "none" ? null : Number(pagoPor),
          compartilhada,
          inicio,
          fim: fim || null,
          ativo: recorrencia?.ativo ?? true,
        });
        toast.success("Recorrência salva.");
        setOpen(false);
        if (!recorrencia) {
          setDescricao("");
          setValor("");
          setCategoria("");
        }
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
            <Plus /> Nova recorrência
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{recorrencia ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto px-0.5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Aluguel, internet, Netflix…" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valor">Valor</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input id="valor" inputMode="decimal" className="pl-9 font-mono tabular" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} required />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dia">Dia do mês</Label>
              <Input id="dia" type="number" min={1} max={31} value={diaMes} onChange={(e) => setDiaMes(e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inicio">Começa em</Label>
              <Input id="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fim">Termina em (opcional)</Label>
              <Input id="fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoria">Categoria</Label>
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
          <p className="text-xs text-muted-foreground">
            A cada mês a saída é lançada automaticamente em Saídas, com a data do dia escolhido.
          </p>
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
