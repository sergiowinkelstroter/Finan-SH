"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  BookmarkCheck,
  CheckCircle2,
  CopyCheck,
  CreditCard,
  FileUp,
  Landmark,
  Layers,
  Repeat,
  Sparkles,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CategoriaIcone } from "@/components/categoria-icone";
import { IconBubble } from "@/components/ds";
import { decodificarArquivo, lerExtrato, sinalDosGastos, type LinhaExtrato } from "@/lib/importacao";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  analisarImportacao,
  importarLancamentos,
  type LinhaAnalisada,
  type StatusLinha,
} from "@/server/importacao-actions";

type Destino = "cartao" | "conta";

interface Linha extends LinhaExtrato {
  valorCents: number;
}

interface Revisao {
  linha: Linha;
  analise: LinhaAnalisada;
  incluir: boolean;
  categoria: string;
  lembrar: boolean;
  /** Criar como compra parcelada completa (só parcela nova no cartão). */
  parcelada: boolean;
}

const STATUS: Record<StatusLinha, { label: string; variant: "success" | "muted" | "info" | "destructive" | "outline"; icon: typeof CopyCheck; marcado: boolean }> = {
  novo: { label: "novo", variant: "success", icon: Sparkles, marcado: true },
  "ja-importado": { label: "já importado", variant: "muted", icon: CopyCheck, marcado: false },
  "parcela-cadastrada": { label: "parcela já cadastrada", variant: "muted", icon: Layers, marcado: false },
  "parcela-nova": { label: "parcelada nova", variant: "info", icon: Layers, marcado: true },
  "conta-fixa": { label: "conta fixa", variant: "outline", icon: Repeat, marcado: false },
  "possivel-duplicata": { label: "possível duplicata", variant: "destructive", icon: TriangleAlert, marcado: false },
  transferencia: { label: "não é gasto", variant: "muted", icon: ArrowLeftRight, marcado: false },
};

const FONTE: Record<string, string> = { regra: "regra", historico: "histórico", padrao: "automático" };

export function ImportadorExtrato({
  cartoes,
  usuarios,
  categorias,
  competenciaAtual,
}: {
  cartoes: { id: number; nome: string }[];
  usuarios: { id: number; nome: string }[];
  categorias: string[];
  competenciaAtual: string;
}) {
  const [destino, setDestino] = useState<Destino>(cartoes.length ? "cartao" : "conta");
  const [cardId, setCardId] = useState(cartoes[0]?.id ? String(cartoes[0].id) : "");
  const [mes, setMes] = useState(competenciaAtual.slice(0, 7));
  const [pessoa, setPessoa] = useState("");
  const [compartilhada, setCompartilhada] = useState(true);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [brutas, setBrutas] = useState<LinhaExtrato[]>([]);
  const [inverter, setInverter] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [revisao, setRevisao] = useState<Revisao[] | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "marcados" | "sem-categoria">("todos");
  const [analisando, startAnalise] = useTransition();
  const [importando, startImport] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const sinal = useMemo(() => (brutas.length ? sinalDosGastos(brutas) * (inverter ? -1 : 1) : 1), [brutas, inverter]);
  const gastos: Linha[] = useMemo(
    () =>
      brutas
        .map((l) => ({ ...l, valorCents: l.valorBrutoCents * sinal }))
        .filter((l) => l.valorCents > 0),
    [brutas, sinal],
  );
  const creditosIgnorados = brutas.length - gastos.length;

  const alvo =
    destino === "cartao"
      ? { destino: "cartao" as const, cardId: Number(cardId), competencia: `${mes}-01` }
      : { destino: "conta" as const };

  async function aoEscolherArquivo(file: File) {
    const texto = decodificarArquivo(await file.arrayBuffer());
    const r = lerExtrato(texto);
    setArquivo(file.name);
    setBrutas(r.linhas);
    setAvisos(r.avisos);
    setInverter(false);
    setRevisao(null);
    if (r.linhas.length) toast.success(`${r.linhas.length} lançamentos lidos (${r.formato.toUpperCase()}).`);
  }

  function analisar() {
    if (destino === "cartao" && !cardId) return toast.error("Escolha o cartão.");
    startAnalise(async () => {
      try {
        const res = await analisarImportacao({
          alvo,
          linhas: gastos.map((l) => ({
            idx: l.idx,
            data: l.data,
            descricao: l.descricao.slice(0, 300),
            valorCents: l.valorCents,
            fitid: l.fitid,
            parcela: destino === "cartao" ? l.parcela : undefined,
          })),
        });
        const porIdx = new Map(res.map((a) => [a.idx, a]));
        setRevisao(
          gastos.map((linha) => {
            const analise = porIdx.get(linha.idx)!;
            return {
              linha,
              analise,
              incluir: STATUS[analise.status].marcado,
              categoria: analise.sugestao ?? "",
              lembrar: false,
              parcelada: analise.status === "parcela-nova",
            };
          }),
        );
      } catch {
        toast.error("Não deu para analisar o arquivo.");
      }
    });
  }

  function atualizar(idx: number, parcial: Partial<Revisao>) {
    setRevisao((r) => r?.map((x) => (x.linha.idx === idx ? { ...x, ...parcial } : x)) ?? null);
  }

  /** Mudou a categoria de um item: aplica aos parecidos sem categoria e lembra a regra. */
  function mudarCategoria(item: Revisao, categoria: string) {
    const chave = item.linha.descricao.toUpperCase().split(/[\s*\-]+/).filter(Boolean)[0];
    setRevisao(
      (r) =>
        r?.map((x) => {
          if (x.linha.idx === item.linha.idx) return { ...x, categoria, lembrar: !!categoria };
          const mesma = x.linha.descricao.toUpperCase().split(/[\s*\-]+/).filter(Boolean)[0] === chave;
          return mesma && !x.categoria ? { ...x, categoria } : x;
        }) ?? null,
    );
  }

  const selecionados = revisao?.filter((r) => r.incluir) ?? [];
  const totalSel = selecionados.reduce((s, r) => s + r.linha.valorCents, 0);
  const semCat = selecionados.filter((r) => !r.categoria).length;
  const visiveis =
    revisao?.filter((r) =>
      filtro === "marcados" ? r.incluir : filtro === "sem-categoria" ? r.incluir && !r.categoria : true,
    ) ?? [];

  function importar() {
    if (!selecionados.length) return toast.error("Nenhum lançamento marcado.");
    startImport(async () => {
      try {
        const res = await importarLancamentos({
          alvo,
          pessoaId: pessoa ? Number(pessoa) : null,
          compartilhada,
          itens: selecionados.map((r) => ({
            origemId: r.analise.origemId,
            data: r.linha.data,
            descricao: r.linha.descricao.slice(0, 300),
            valorCents: r.linha.valorCents,
            categoria: r.categoria || null,
            parcela: r.parcelada && r.linha.parcela ? r.linha.parcela : null,
            lembrarRegra: r.lembrar,
          })),
        });
        toast.success(
          `${res.importados} lançamentos importados${res.ignorados ? `, ${res.ignorados} já existiam` : ""}${res.regras ? ` · ${res.regras} regras salvas` : ""}.`,
        );
        setRevisao(null);
        setBrutas([]);
        setArquivo(null);
        if (inputRef.current) inputRef.current.value = "";
      } catch {
        toast.error("Não deu para importar. Confira os dados.");
      }
    });
  }

  const classeCampo = "h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground";

  return (
    <div className="flex flex-col gap-5">
      {/* Passo 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-violeta text-xs text-white">1</span>
            De onde vem o arquivo?
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: "cartao", label: "Fatura do cartão", desc: "Vira compras no cartão", icon: CreditCard },
                { id: "conta", label: "Extrato da conta", desc: "Vira saídas (Pix, débito)", icon: Landmark },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={o.id === "cartao" && !cartoes.length}
                onClick={() => {
                  setDestino(o.id);
                  setRevisao(null);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-50",
                  destino === o.id ? "border-violeta bg-violeta/5 ring-1 ring-violeta" : "border-border hover:bg-accent",
                )}
              >
                <IconBubble icon={o.icon} cor={destino === o.id ? "#6c4cf0" : "#6b6885"} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-foreground">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {destino === "cartao" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="imp-cartao">Cartão</Label>
                  <select id="imp-cartao" className={classeCampo} value={cardId} onChange={(e) => { setCardId(e.target.value); setRevisao(null); }}>
                    {cartoes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="imp-mes">Fatura de</Label>
                  <input id="imp-mes" type="month" className={classeCampo} value={mes} onChange={(e) => { setMes(e.target.value); setRevisao(null); }} />
                </div>
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="imp-pessoa">{destino === "cartao" ? "Quem comprou" : "Pago por"}</Label>
              <select id="imp-pessoa" className={classeCampo} value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
                <option value="">—</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-foreground">
              <input type="checkbox" className="size-4 accent-violeta" checked={compartilhada} onChange={(e) => setCompartilhada(e.target.checked)} />
              Gastos do casal (entra no acerto)
            </label>
          </div>

          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
              arquivo ? "border-menta/50 bg-menta/5" : "border-border hover:border-violeta/50 hover:bg-violeta/5",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void aoEscolherArquivo(f);
            }}
          >
            <IconBubble icon={arquivo ? CheckCircle2 : FileUp} cor={arquivo ? "#0ea88c" : "#6c4cf0"} size="lg" />
            <span className="font-semibold text-foreground">{arquivo ?? "Escolha ou arraste o arquivo"}</span>
            <span className="text-xs text-muted-foreground">
              CSV ou OFX exportado pelo app/site do banco (Nubank, Inter, Itaú, C6, BB…)
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.ofx,.txt,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void aoEscolherArquivo(f);
              }}
            />
          </label>

          {avisos.map((a) => (
            <p key={a} className="flex items-center gap-2 rounded-xl bg-[#f59e0b]/10 p-3 text-xs text-[#a16207]">
              <TriangleAlert className="size-4 shrink-0" /> {a}
            </p>
          ))}

          {brutas.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground">
                <strong>{gastos.length}</strong> gastos ({formatCents(gastos.reduce((s, l) => s + l.valorCents, 0))})
                {creditosIgnorados > 0 && (
                  <span className="text-muted-foreground"> · {creditosIgnorados} créditos/pagamentos ignorados</span>
                )}
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" className="accent-violeta" checked={inverter} onChange={(e) => { setInverter(e.target.checked); setRevisao(null); }} />
                  Inverter sinais
                </label>
                <Button onClick={analisar} disabled={analisando || !gastos.length}>
                  <Wand2 /> {analisando ? "Analisando…" : "Analisar e categorizar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Passo 2 */}
      {revisao && (
        <Card className="overflow-hidden">
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-violeta text-xs text-white">2</span>
              Revise antes de importar
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Já marcamos o que é novo e desmarcamos o que parece repetido (parcelas já cadastradas, contas fixas,
              lançamentos iguais). Ao trocar uma categoria, o app aplica aos parecidos e lembra para a próxima vez.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(["todos", "marcados", "sem-categoria"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFiltro(f)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filtro === f ? "bg-violeta text-white" : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f === "todos" ? `Todos (${revisao.length})` : f === "marcados" ? `Marcados (${selecionados.length})` : `Sem categoria (${semCat})`}
                </button>
              ))}
            </div>
          </CardHeader>
          <div className="divide-y divide-border/60 border-t border-border">
            {visiveis.map((r) => {
              const st = STATUS[r.analise.status];
              return (
                <div key={r.linha.idx} className={cn("flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center", !r.incluir && "bg-muted/30")}>
                  <label className="flex min-w-0 flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-violeta"
                      checked={r.incluir}
                      onChange={(e) => atualizar(r.linha.idx, { incluir: e.target.checked })}
                      aria-label={`Importar ${r.linha.descricao}`}
                    />
                    <CategoriaIcone nome={r.categoria || null} size="sm" className={cn(!r.incluir && "opacity-50")} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("truncate text-sm font-medium", r.incluir ? "text-foreground" : "text-muted-foreground line-through")}>
                        {r.linha.descricao}
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {r.linha.data.split("-").reverse().slice(0, 2).join("/")}
                        <Badge variant={st.variant}>
                          <st.icon className="size-3" /> {st.label}
                        </Badge>
                        {r.analise.detalhe && <span className="truncate">{r.analise.detalhe}</span>}
                      </span>
                    </span>
                  </label>
                  <div className="flex items-center gap-2 pl-7 sm:pl-0">
                    <div className="flex flex-col">
                      <input
                        list="imp-categorias"
                        value={r.categoria}
                        onChange={(e) => mudarCategoria(r, e.target.value)}
                        placeholder="Categoria"
                        className={cn(
                          "h-9 w-40 rounded-lg border bg-card px-2.5 text-sm",
                          r.incluir && !r.categoria ? "border-[#f59e0b]" : "border-input",
                        )}
                        aria-label={`Categoria de ${r.linha.descricao}`}
                      />
                      {r.categoria && (r.lembrar || r.analise.fonte) && (
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          {r.lembrar ? (
                            <><BookmarkCheck className="size-3 text-violeta" /> vai virar regra</>
                          ) : (
                            <>sugestão: {FONTE[r.analise.fonte!]}</>
                          )}
                        </span>
                      )}
                    </div>
                    <span className="w-24 text-right font-mono text-sm font-semibold tabular text-tinta">
                      {formatCents(r.linha.valorCents)}
                    </span>
                  </div>
                  {r.analise.status === "parcela-nova" && r.incluir && (
                    <label className="flex items-center gap-1.5 pl-7 text-xs text-muted-foreground sm:pl-0">
                      <input
                        type="checkbox"
                        className="accent-violeta"
                        checked={r.parcelada}
                        onChange={(e) => atualizar(r.linha.idx, { parcelada: e.target.checked })}
                      />
                      criar as {r.linha.parcela?.total} parcelas
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <datalist id="imp-categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="sticky bottom-20 flex flex-col gap-3 border-t border-border bg-card/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-0">
            <p className="text-sm text-foreground">
              <strong>{selecionados.length}</strong> marcados · <span className="font-mono tabular">{formatCents(totalSel)}</span>
              {semCat > 0 && <span className="text-[#a16207]"> · {semCat} sem categoria</span>}
            </p>
            <Button onClick={importar} disabled={importando || !selecionados.length} size="lg">
              <FileUp /> {importando ? "Importando…" : `Importar ${selecionados.length}`}
            </Button>
          </div>
        </Card>
      )}

      {!revisao && (
        <p className="text-center text-xs text-muted-foreground">
          Depois de importar, veja o resultado em{" "}
          <Link href="/fluxo" className="font-medium text-violeta hover:underline">Para onde vai</Link>.
        </p>
      )}
    </div>
  );
}
