"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, CircleDot, CreditCard, Lock, LockKeyhole, RefreshCw, RotateCcw, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ValorEfetivo } from "@/components/valor-efetivo";
import { diasDesde, formatDataCurta, hojeISO } from "@/lib/dates";
import { formatCentsSemSimbolo, parseReaisParaCents } from "@/lib/money";
import type { FaturaEfetiva } from "@/server/faturas";
import {
  atualizarParcial,
  fecharFatura,
  marcarFaturaPaga,
  reabrirFatura,
} from "@/server/faturas-actions";

export function FaturaRow({
  fatura,
  competencia,
}: {
  fatura: FaturaEfetiva;
  competencia: string;
}) {
  const { card, invoice } = fatura;
  const status = invoice?.status ?? "aberta";

  const vencida = status !== "paga" && fatura.valorCents > 0 && fatura.vencimento < hojeISO();
  const StatusIcon = status === "paga" ? CheckCircle2 : status === "fechada" ? Lock : CircleDot;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div
        className={cn(
          "relative flex flex-col gap-4 overflow-hidden p-4 text-white",
          status === "paga" ? "bg-gradient-to-br from-[#0ea88c] to-[#0b8a73]" : "bg-gradient-to-br from-violeta to-azul",
        )}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <CreditCard className="size-5 shrink-0 opacity-90" />
            <span className="truncate font-display text-base font-semibold">{card.nome}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-white/25">
            <StatusIcon className="size-3" />
            {status}
          </span>
        </div>
        <div className="relative flex items-end justify-between gap-3">
          <div className="flex flex-col text-xs text-white/80">
            <span>fecha dia {card.diaFechamento}</span>
            <span>vence {formatDataCurta(fatura.vencimento)}</span>
          </div>
          <div className="rounded-xl bg-white px-2.5 py-1 shadow-sm">
            <ValorEfetivo
              valorCents={fatura.valorCents}
              tipo={fatura.tipo}
              diasDesdeAtualizacao={
                invoice?.parcialAtualizadoEm ? diasDesde(invoice.parcialAtualizadoEm) : null
              }
            />
          </div>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {(vencida || (status === "paga" && invoice?.pagoEm)) && (
          <div className="flex flex-wrap gap-1.5">
            {vencida && <Badge variant="destructive">vencida</Badge>}
            {status === "paga" && invoice?.pagoEm && (
              <Badge variant="success">paga em {formatDataCurta(invoice.pagoEm)}</Badge>
            )}
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-2">
          {status === "aberta" && (
            <>
              <AtualizarParcialDialog
                cardId={card.id}
                competencia={competencia}
                valorAtualCents={invoice?.valorParcialCents ?? 0}
              />
              <FecharFaturaDialog cardId={card.id} competencia={competencia} />
            </>
          )}
          {status === "fechada" && invoice && (
            <>
              <MarcarPagaDialog invoiceId={invoice.id} />
              <ReabrirButton invoiceId={invoice.id} />
            </>
          )}
          {status === "paga" && invoice && <ReabrirButton invoiceId={invoice.id} />}
        </div>
      </CardContent>
    </Card>
  );
}

function AtualizarParcialDialog({
  cardId,
  competencia,
  valorAtualCents,
}: {
  cardId: number;
  competencia: string;
  valorAtualCents: number;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(
    valorAtualCents ? formatCentsSemSimbolo(valorAtualCents) : "",
  );
  const [pending, startTransition] = useTransition();

  function handleSalvar() {
    startTransition(async () => {
      try {
        await atualizarParcial({
          cardId,
          competencia,
          valorParcialCents: parseReaisParaCents(valor),
        });
        toast.success("Parcial atualizado.");
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
          <RefreshCw /> Atualizar parcial
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valor parcial da fatura</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="parcial">Valor visto no app do banco</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="parcial"
              inputMode="decimal"
              autoFocus
              className="pl-9 font-mono tabular"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSalvar} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FecharFaturaDialog({
  cardId,
  competencia,
}: {
  cardId: number;
  competencia: string;
}) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [pending, startTransition] = useTransition();

  function handleFechar() {
    startTransition(async () => {
      try {
        await fecharFatura({
          cardId,
          competencia,
          valorFechadoCents: parseReaisParaCents(valor),
        });
        toast.success("Fatura fechada.");
        setOpen(false);
      } catch {
        toast.error("Não deu para fechar a fatura.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LockKeyhole /> Fechar fatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar fatura</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fechado">Valor definitivo</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              R$
            </span>
            <Input
              id="fechado"
              inputMode="decimal"
              autoFocus
              className="pl-9 font-mono tabular"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleFechar} disabled={pending || !valor}>
            {pending ? "Fechando…" : "Fechar fatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MarcarPagaDialog({ invoiceId }: { invoiceId: number }) {
  const [open, setOpen] = useState(false);
  const [pagoEm, setPagoEm] = useState(hojeISO());
  const [pending, startTransition] = useTransition();

  function handleMarcar() {
    startTransition(async () => {
      try {
        await marcarFaturaPaga({ id: invoiceId, pagoEm });
        toast.success("Fatura marcada como paga.");
        setOpen(false);
      } catch {
        toast.error("Não deu para marcar como paga.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Wallet /> Marcar paga
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar fatura como paga</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pagoEm">Pago em</Label>
          <Input
            id="pagoEm"
            type="date"
            value={pagoEm}
            onChange={(e) => setPagoEm(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleMarcar} disabled={pending}>
            {pending ? "Salvando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReabrirButton({ invoiceId }: { invoiceId: number }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await reabrirFatura(invoiceId);
        toast.success("Fatura reaberta.");
      } catch {
        toast.error("Não deu certo.");
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={handleClick}>
      <RotateCcw /> {pending ? "…" : "Reabrir"}
    </Button>
  );
}
