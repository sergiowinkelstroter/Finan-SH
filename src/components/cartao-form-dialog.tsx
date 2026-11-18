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
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { criarCartao, editarCartao } from "@/server/cartoes-actions";

const BANDEIRAS = ["Visa", "Mastercard", "Elo", "American Express", "Outra"];

type Usuario = { id: number; nome: string };

type CartaoExistente = {
  id: number;
  nome: string;
  bandeira: string | null;
  titularId: number | null;
  limiteCents: number | null;
  diaFechamento: number;
  diaVencimento: number;
};

export function CartaoFormDialog({
  usuarios,
  cartao,
  trigger,
}: {
  usuarios: Usuario[];
  cartao?: CartaoExistente;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [nome, setNome] = useState(cartao?.nome ?? "");
  const [bandeira, setBandeira] = useState(cartao?.bandeira ?? "");
  const [titularId, setTitularId] = useState<string>(
    cartao?.titularId ? String(cartao.titularId) : "none",
  );
  const [limite, setLimite] = useState(
    cartao?.limiteCents ? formatCentsSemSimbolo(cartao.limiteCents) : "",
  );
  const [diaFechamento, setDiaFechamento] = useState(
    cartao ? String(cartao.diaFechamento) : "",
  );
  const [diaVencimento, setDiaVencimento] = useState(
    cartao ? String(cartao.diaVencimento) : "",
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      nome,
      bandeira: bandeira || null,
      titularId: titularId === "none" ? null : Number(titularId),
      limiteCents: limite ? parseReaisParaCents(limite) : null,
      diaFechamento: Number(diaFechamento),
      diaVencimento: Number(diaVencimento),
    };

    startTransition(async () => {
      try {
        if (cartao) {
          await editarCartao(cartao.id, input);
          toast.success("Cartão atualizado.");
        } else {
          await criarCartao(input);
          toast.success("Cartão cadastrado.");
        }
        setOpen(false);
        if (!cartao) {
          setNome("");
          setBandeira("");
          setTitularId("none");
          setLimite("");
          setDiaFechamento("");
          setDiaVencimento("");
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
            <Plus /> Novo cartão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cartao ? "Editar cartão" : "Novo cartão"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nubank, Inter, C6…"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Bandeira</Label>
              <Select value={bandeira || undefined} onValueChange={setBandeira}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  {BANDEIRAS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Titular</Label>
              <Select value={titularId} onValueChange={setTitularId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="limite">Limite</Label>
              <Input
                id="limite"
                inputMode="decimal"
                placeholder="0,00"
                value={limite}
                onChange={(e) => setLimite(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fechamento">Fecha dia</Label>
              <Input
                id="fechamento"
                type="number"
                min={1}
                max={31}
                value={diaFechamento}
                onChange={(e) => setDiaFechamento(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="vencimento">Vence dia</Label>
              <Input
                id="vencimento"
                type="number"
                min={1}
                max={31}
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
                required
              />
            </div>
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
