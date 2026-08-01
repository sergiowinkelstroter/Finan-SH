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
import { competenciaAtualISO } from "@/lib/dates";
import { parseReaisParaCents } from "@/lib/money";
import { criarCompra } from "@/server/compras-actions";

type Cartao = { id: number; nome: string };
type Usuario = { id: number; nome: string };

export function CompraFormDialog({
  cartoes,
  usuarios,
}: {
  cartoes: Cartao[];
  usuarios: Usuario[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [cardId, setCardId] = useState(cartoes[0] ? String(cartoes[0].id) : "");
  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState("1");
  const [primeiraCompetencia, setPrimeiraCompetencia] = useState(
    competenciaAtualISO().slice(0, 7),
  );
  const [compradorId, setCompradorId] = useState("none");

  function reset() {
    setDescricao("");
    setValorTotal("");
    setQtdParcelas("1");
    setPrimeiraCompetencia(competenciaAtualISO().slice(0, 7));
    setCompradorId("none");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await criarCompra({
          cardId: Number(cardId),
          descricao,
          valorTotalCents: parseReaisParaCents(valorTotal),
          qtdParcelas: Number(qtdParcelas),
          primeiraCompetencia: `${primeiraCompetencia}-01`,
          compradorId: compradorId === "none" ? null : Number(compradorId),
        });
        toast.success("Compra cadastrada.");
        setOpen(false);
        reset();
      } catch {
        toast.error("Não deu para salvar. Confira os campos.");
      }
    });
  }

  if (cartoes.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nova compra
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compra parcelada</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Geladeira, viagem, notebook…"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cartão</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent>
                {cartoes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="valorTotal">Valor total</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  R$
                </span>
                <Input
                  id="valorTotal"
                  inputMode="decimal"
                  className="pl-9 font-mono tabular"
                  placeholder="0,00"
                  value={valorTotal}
                  onChange={(e) => setValorTotal(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qtdParcelas">Parcelas</Label>
              <Input
                id="qtdParcelas"
                type="number"
                min={1}
                max={48}
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primeiraCompetencia">1ª fatura em</Label>
              <Input
                id="primeiraCompetencia"
                type="month"
                value={primeiraCompetencia}
                onChange={(e) => setPrimeiraCompetencia(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Comprado por</Label>
              <Select value={compradorId} onValueChange={setCompradorId}>
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
