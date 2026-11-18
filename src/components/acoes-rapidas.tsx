"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, CreditCard, PiggyBank, type LucideIcon } from "lucide-react";
import { AporteFormDialog } from "@/components/aporte-form-dialog";
import { CompraFormDialog } from "@/components/compra-form-dialog";
import { EntradaFormDialog } from "@/components/entrada-form-dialog";
import { SaidaFormDialog } from "@/components/saida-form-dialog";
import { cn } from "@/lib/utils";

export type Acao = "saida" | "compra" | "entrada" | "reserva";

export interface DadosAcoes {
  usuarios: { id: number; nome: string }[];
  cartoes: { id: number; nome: string }[];
  categorias: string[];
}

export const ACOES: { id: Acao; label: string; descricao: string; icon: LucideIcon; cor: string }[] = [
  { id: "saida", label: "Saída", descricao: "Pix, débito, dinheiro", icon: ArrowUpCircle, cor: "#e2496b" },
  { id: "compra", label: "Cartão", descricao: "Compra à vista ou parcelada", icon: CreditCard, cor: "#6c4cf0" },
  { id: "entrada", label: "Entrada", descricao: "Salário, extra, reembolso", icon: ArrowDownCircle, cor: "#0ea88c" },
  { id: "reserva", label: "Reserva", descricao: "Guardar dinheiro do mês", icon: PiggyBank, cor: "#10b981" },
];

/** Os quatro formulários de lançamento, controlados por `acao` (sem gatilho próprio). */
export function DialogsAcoes({
  dados,
  acao,
  onClose,
}: {
  dados: DadosAcoes;
  acao: Acao | null;
  onClose: () => void;
}) {
  const props = (id: Acao) => ({
    trigger: null,
    open: acao === id,
    onOpenChange: (v: boolean) => !v && onClose(),
  });
  return (
    <>
      <SaidaFormDialog usuarios={dados.usuarios} categorias={dados.categorias} {...props("saida")} />
      <CompraFormDialog
        cartoes={dados.cartoes}
        usuarios={dados.usuarios}
        categorias={dados.categorias}
        {...props("compra")}
      />
      <EntradaFormDialog usuarios={dados.usuarios} {...props("entrada")} />
      <AporteFormDialog {...props("reserva")} />
    </>
  );
}

/** Fila de atalhos redondos (padrão app de banco) para o topo do dashboard. */
export function AcoesRapidas({ dados, className }: { dados: DadosAcoes; className?: string }) {
  const [acao, setAcao] = useState<Acao | null>(null);
  return (
    <>
      <div className={cn("grid grid-cols-4 gap-2", className)}>
        {ACOES.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAcao(a.id)}
              className="group flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <span
                className="flex size-14 items-center justify-center rounded-2xl shadow-card ring-1 ring-border/70 transition-transform group-hover:-translate-y-0.5 group-active:scale-95"
                style={{ background: `color-mix(in srgb, ${a.cor} 10%, white)`, color: a.cor }}
              >
                <Icon className="size-6" />
              </span>
              {a.label}
            </button>
          );
        })}
      </div>
      <DialogsAcoes dados={dados} acao={acao} onClose={() => setAcao(null)} />
    </>
  );
}
