"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CheckCheck, FolderInput, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoriaIcone } from "@/components/categoria-icone";
import { ListCard } from "@/components/ds";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { recategorizar } from "@/server/categoria-actions";
import type { ItemCategoria } from "@/server/categoria";

const NOVA = "__nova__";

function dataCurta(iso: string, tipo: ItemCategoria["tipo"]) {
  const [a, m, d] = iso.split("-");
  return tipo === "compra" ? `fatura ${m}/${a.slice(2)}` : `${d}/${m}`;
}

export function RecategorizarLista({
  itens,
  categoriaAtual,
  categorias,
}: {
  itens: ItemCategoria[];
  categoriaAtual: string;
  categorias: string[];
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [destino, setDestino] = useState("");
  const [nova, setNova] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [pending, start] = useTransition();

  const opcoes = useMemo(() => categorias.filter((c) => c !== categoriaAtual), [categorias, categoriaAtual]);
  const comSugestao = itens.filter((i) => i.editavel && i.sugestao && i.sugestao !== categoriaAtual);
  const selecionados = itens.filter((i) => sel.has(i.chave));
  const totalSel = selecionados.reduce((s, i) => s + i.valorCents, 0);

  function alternar(chave: string) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(chave)) n.delete(chave);
      else n.add(chave);
      return n;
    });
  }

  function mover(lista: ItemCategoria[], categoria: string | null, regra: boolean) {
    start(async () => {
      try {
        const r = await recategorizar({
          saidas: lista.filter((i) => i.tipo === "saida").map((i) => i.id),
          compras: lista.filter((i) => i.tipo === "compra").map((i) => i.id),
          categoria,
          lembrarRegra: regra,
        });
        toast.success(
          `${r.alterados} ${r.alterados === 1 ? "lançamento movido" : "lançamentos movidos"} para ${categoria ?? "Sem categoria"}${r.regras ? ` · ${r.regras} regra${r.regras > 1 ? "s" : ""} salva${r.regras > 1 ? "s" : ""}` : ""}.`,
        );
        setSel(new Set());
        setDestino("");
        setNova("");
      } catch {
        toast.error("Não deu para mudar a categoria.");
      }
    });
  }

  /** Aplica as sugestões agrupando por categoria (uma chamada por categoria). */
  function aplicarSugestoes(lista: ItemCategoria[]) {
    const grupos = new Map<string, ItemCategoria[]>();
    for (const i of lista) grupos.set(i.sugestao!, [...(grupos.get(i.sugestao!) ?? []), i]);
    start(async () => {
      try {
        let total = 0;
        for (const [categoria, g] of grupos) {
          const r = await recategorizar({
            saidas: g.filter((i) => i.tipo === "saida").map((i) => i.id),
            compras: g.filter((i) => i.tipo === "compra").map((i) => i.id),
            categoria,
            lembrarRegra: true,
          });
          total += r.alterados;
        }
        toast.success(`${total} lançamentos categorizados.`);
      } catch {
        toast.error("Não deu para aplicar as sugestões.");
      }
    });
  }

  const categoriaEscolhida = destino === NOVA ? nova.trim() : destino;
  const editaveis = itens.filter((i) => i.editavel);

  return (
    <div className="flex flex-col gap-4 pb-28 lg:pb-20">
      {comSugestao.length > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-violeta/30 bg-violeta/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-violeta" />
            <span>
              Temos sugestão para <strong>{comSugestao.length}</strong> lançamentos, pelo nome do estabelecimento e pelo que vocês já categorizaram.
            </span>
          </p>
          <Button onClick={() => aplicarSugestoes(comSugestao)} disabled={pending} className="shrink-0">
            <CheckCheck /> Aplicar todas
          </Button>
        </div>
      )}

      {editaveis.length > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
          <span>Toque para selecionar e mover de categoria.</span>
          <button
            type="button"
            className="font-semibold text-violeta"
            onClick={() => setSel(sel.size === editaveis.length ? new Set() : new Set(editaveis.map((i) => i.chave)))}
          >
            {sel.size === editaveis.length ? "Limpar" : "Selecionar todos"}
          </button>
        </div>
      )}

      <ListCard>
        {itens.map((i) => {
          const marcado = sel.has(i.chave);
          return (
            <div
              key={i.chave}
              className={cn("flex flex-col gap-2 px-3.5 py-3 transition-colors sm:px-4", marcado && "bg-violeta/5")}
            >
              <button
                type="button"
                disabled={!i.editavel || pending}
                onClick={() => alternar(i.chave)}
                className="flex w-full items-center gap-3 text-left disabled:cursor-default"
                aria-pressed={marcado}
              >
                {i.editavel ? (
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      marcado ? "border-violeta bg-violeta text-white" : "border-transparent",
                    )}
                  >
                    {marcado ? <Check className="size-5" /> : <CategoriaIcone nome={categoriaAtual} />}
                  </span>
                ) : (
                  <CategoriaIcone nome={categoriaAtual} />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground">{i.descricao}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {dataCurta(i.data, i.tipo)} · {i.detalhe}
                    {i.tipo === "compra" && <Badge variant="info">cartão</Badge>}
                  </span>
                </span>
                <span className="whitespace-nowrap font-mono text-sm font-semibold tabular text-tinta">
                  {formatCents(i.valorCents)}
                </span>
              </button>
              {i.editavel && i.sugestao && i.sugestao !== categoriaAtual && (
                <div className="flex items-center gap-2 pl-[52px]">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => mover([i], i.sugestao, true)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-violeta/10 hover:text-violeta"
                  >
                    <CategoriaIcone nome={i.sugestao} size="sm" className="size-5 [&_svg]:size-3" />
                    Mover para {i.sugestao}
                    <Check className="size-3.5 text-violeta" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </ListCard>

      {selecionados.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 px-3 lg:bottom-4 lg:left-64 lg:px-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-2.5 rounded-3xl border border-border bg-card p-3.5 shadow-xl">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>
                <strong>{selecionados.length}</strong> selecionado{selecionados.length > 1 ? "s" : ""} ·{" "}
                <span className="font-mono tabular">{formatCents(totalSel)}</span>
              </span>
              <button type="button" aria-label="Limpar seleção" onClick={() => setSel(new Set())} className="rounded-full p-1 text-muted-foreground hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                aria-label="Nova categoria"
                className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="">Mover para…</option>
                {opcoes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value={NOVA}>+ Nova categoria</option>
              </select>
              <Button
                onClick={() => mover(selecionados, categoriaEscolhida || null, lembrar)}
                disabled={pending || !categoriaEscolhida}
                className="h-11"
              >
                <FolderInput /> Mover
              </Button>
            </div>
            {destino === NOVA && (
              <input
                autoFocus
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                placeholder="Nome da categoria (ex.: Farmácia)"
                className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
              />
            )}
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" className="accent-violeta" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              Lembrar: próximos lançamentos desses estabelecimentos já vêm nessa categoria
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
