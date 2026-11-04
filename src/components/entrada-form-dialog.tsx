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
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import { salvarEntrada } from "@/server/entradas-actions";

type Usuario = { id: number; nome: string };

type EntradaExistente = {
  id: number;
  userId: number | null;
  descricao: string;
  valorCents: number;
  tipo: string;
  competencia: string | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
};

export function EntradaFormDialog({
  usuarios,
  entrada,
  trigger,
}: {
  usuarios: Usuario[];
  entrada?: EntradaExistente;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [descricao, setDescricao] = useState(entrada?.descricao ?? "");
  const [valor, setValor] = useState(
    entrada ? formatCentsSemSimbolo(entrada.valorCents) : "",
  );
  const [tipo, setTipo] = useState<"fixa" | "extra">(
    entrada?.tipo === "extra" ? "extra" : "fixa",
  );
  const [userId, setUserId] = useState(entrada?.userId ? String(entrada.userId) : "none");
  const [competencia, setCompetencia] = useState(
    entrada?.competencia?.slice(0, 7) ?? competenciaAtualISO().slice(0, 7),
  );

  const [vigInicio, setVigInicio] = useState(entrada?.vigenciaInicio ?? "");
  const [vigFim, setVigFim] = useState(entrada?.vigenciaFim ?? "");

  function reset() {
    setVigInicio("");
    setVigFim("");
    setDescricao("");
    setValor("");
    setTipo("fixa");
    setUserId("none");
    setCompetencia(competenciaAtualISO().slice(0, 7));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await salvarEntrada({
          id: entrada?.id,
          descricao,
          valorCents: parseReaisParaCents(valor),
          tipo,
          userId: userId === "none" ? null : Number(userId),
          competencia: tipo === "extra" ? `${competencia}-01` : null,
          vigenciaInicio: tipo === "fixa" ? vigInicio || null : null,
          vigenciaFim: tipo === "fixa" ? vigFim || null : null,
        });
        toast.success("Entrada salva.");
        setOpen(false);
        if (!entrada) reset();
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
            <Plus /> Nova entrada
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entrada ? "Editar entrada" : "Nova entrada"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Salário, freela, 13º…"
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
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "fixa" | "extra")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixa">Fixa (todo mês)</SelectItem>
                  <SelectItem value="extra">Extra (um mês)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Recebido por</Label>
              <Select value={userId} onValueChange={setUserId}>
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

            {tipo === "extra" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="competencia">Mês</Label>
                <Input
                  id="competencia"
                  type="month"
                  value={competencia}
                  onChange={(e) => setCompetencia(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {tipo === "fixa" && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vigInicio">Vale a partir de</Label>
                  <Input id="vigInicio" type="date" value={vigInicio} onChange={(e) => setVigInicio(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="vigFim">Até (opcional)</Label>
                  <Input id="vigFim" type="date" value={vigFim} onChange={(e) => setVigFim(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Mudou o salário? Encerre esta entrada e crie outra: o histórico dos meses
                passados continua com o valor antigo.
              </p>
            </div>
          )}

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
