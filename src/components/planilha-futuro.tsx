"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  CreditCard,
  FlaskConical,
  Landmark,
  PiggyBank,
  Plus,
  Receipt,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
  Trash2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LineChart } from "@/components/charts/line-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatCents, formatCentsSemSimbolo, formatCompacto, parseReaisParaCents } from "@/lib/money";
import { definirSaldoConta } from "@/server/planilha-actions";

type Grupo = "entradas" | "fixas" | "cartoes" | "variaveis" | "reserva" | "simulacoes";

interface Linha {
  id: string;
  grupo: Grupo;
  rotulo: string;
  categoria: string | null;
  valores: number[];
  estimado?: boolean;
}

interface Mes {
  competencia: string;
  label: string;
  ano: string;
  atual: boolean;
}

interface Simulacao {
  id: string;
  descricao: string;
  valorCents: number;
  parcelas: number;
  inicio: number; // índice do mês
}

const GRUPOS: { id: Grupo; titulo: string; icon: LucideIcon; entrada?: boolean; cor: string }[] = [
  { id: "entradas", titulo: "Entradas", icon: TrendingUp, entrada: true, cor: "text-menta" },
  { id: "fixas", titulo: "Contas fixas", icon: Receipt, cor: "text-azul" },
  { id: "cartoes", titulo: "Cartões (faturas)", icon: CreditCard, cor: "text-violeta" },
  { id: "variaveis", titulo: "Gastos variáveis (média)", icon: ShoppingBag, cor: "text-[#f59e0b]" },
  { id: "reserva", titulo: "Reserva", icon: PiggyBank, cor: "text-menta" },
  { id: "simulacoes", titulo: "Simulações (e se…?)", icon: FlaskConical, cor: "text-rosa" },
];

const CHAVE_LOCAL = "finan:planilha:v1";

function lerLocal(): { ajustes: Record<string, number>; simulacoes: Simulacao[] } {
  try {
    const raw = window.localStorage.getItem(CHAVE_LOCAL);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { ajustes: {}, simulacoes: [] };
}

export function PlanilhaFuturo({
  meses,
  linhas: linhasBase,
  saldoInicialCents,
}: {
  meses: Mes[];
  linhas: Linha[];
  saldoInicialCents: number;
}) {
  const [ajustes, setAjustes] = useState<Record<string, number>>({});
  const [simulacoes, setSimulacoes] = useState<Simulacao[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [fechados, setFechados] = useState<Set<Grupo>>(new Set());
  const [editando, setEditando] = useState<string | null>(null);
  const [saldoTexto, setSaldoTexto] = useState(formatCentsSemSimbolo(saldoInicialCents));
  const [salvandoSaldo, startSaldo] = useTransition();

  useEffect(() => {
    // Carrega do localStorage só no cliente (evita divergência de hidratação).
    const local = lerLocal();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAjustes(local.ajustes ?? {});
    setSimulacoes(local.simulacoes ?? []);
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(CHAVE_LOCAL, JSON.stringify({ ajustes, simulacoes }));
    } catch {}
  }, [ajustes, simulacoes, carregado]);

  const saldoInicial = parseReaisParaCents(saldoTexto);

  const linhas = useMemo<Linha[]>(() => {
    const base = linhasBase.map((l) => ({
      ...l,
      valores: l.valores.map((v, i) => ajustes[`${l.id}|${i}`] ?? v),
    }));
    const sims = simulacoes.map<Linha>((s) => ({
      id: s.id,
      grupo: "simulacoes",
      rotulo: s.parcelas > 1 ? `${s.descricao} (${s.parcelas}x)` : s.descricao,
      categoria: null,
      valores: meses.map((_, i) => {
        const n = i - s.inicio;
        if (n < 0 || n >= s.parcelas) return 0;
        const parcela = Math.floor(s.valorCents / s.parcelas);
        return n === 0 ? s.valorCents - parcela * (s.parcelas - 1) : parcela;
      }),
    }));
    return [...base, ...sims];
  }, [linhasBase, ajustes, simulacoes, meses]);

  const totais = useMemo(() => {
    const porGrupo = new Map<Grupo, number[]>();
    for (const g of GRUPOS) porGrupo.set(g.id, meses.map(() => 0));
    for (const l of linhas) {
      const arr = porGrupo.get(l.grupo)!;
      l.valores.forEach((v, i) => (arr[i] += v));
    }
    const entradas = porGrupo.get("entradas")!;
    const saidas = meses.map((_, i) =>
      GRUPOS.filter((g) => !g.entrada).reduce((s, g) => s + porGrupo.get(g.id)![i], 0),
    );
    const resultado = meses.map((_, i) => entradas[i] - saidas[i]);
    const acumulado: number[] = [];
    resultado.forEach((r, i) => acumulado.push((i === 0 ? saldoInicial : acumulado[i - 1]) + r));
    return { porGrupo, entradas, saidas, resultado, acumulado };
  }, [linhas, meses, saldoInicial]);

  const primeiroNegativo = totais.acumulado.findIndex((v) => v < 0);
  const saldoFinal = totais.acumulado[totais.acumulado.length - 1] ?? 0;
  const temAjustes = Object.keys(ajustes).length > 0 || simulacoes.length > 0;

  function salvarSaldo() {
    startSaldo(async () => {
      try {
        await definirSaldoConta(saldoInicial);
        toast.success("Saldo inicial salvo.");
      } catch {
        toast.error("Não deu para salvar o saldo.");
      }
    });
  }

  function editarCelula(id: string, i: number, texto: string) {
    const cents = parseReaisParaCents(texto);
    setAjustes((a) => {
      const novo = { ...a };
      const base = linhasBase.find((l) => l.id === id)?.valores[i];
      if (cents === base) delete novo[`${id}|${i}`];
      else novo[`${id}|${i}`] = cents;
      return novo;
    });
    setEditando(null);
  }

  function alternar(g: Grupo) {
    setFechados((s) => {
      const n = new Set(s);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="flex flex-col gap-2 p-4">
            <Label htmlFor="saldo-inicial" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Landmark className="size-3.5" /> Saldo hoje em conta
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  id="saldo-inicial"
                  inputMode="decimal"
                  className="pl-9 font-mono tabular"
                  value={saldoTexto}
                  onChange={(e) => setSaldoTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarSaldo()}
                />
              </div>
              <Button
                variant="secondary"
                onClick={salvarSaldo}
                disabled={salvandoSaldo || saldoInicial === saldoInicialCents}
              >
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
        <Resumo
          icon={Wallet}
          titulo={`Saldo em ${meses[meses.length - 1]?.label ?? ""}/${meses[meses.length - 1]?.ano.slice(2) ?? ""}`}
          valor={formatCents(saldoFinal)}
          cor={saldoFinal < 0 ? "text-rosa" : "text-menta"}
        />
        <Resumo
          icon={primeiroNegativo >= 0 ? AlertTriangle : CalendarClock}
          titulo={primeiroNegativo >= 0 ? "Vai faltar dinheiro em" : "Saldo fica positivo"}
          valor={primeiroNegativo >= 0 ? `${meses[primeiroNegativo].label}/${meses[primeiroNegativo].ano.slice(2)}` : "o período todo"}
          cor={primeiroNegativo >= 0 ? "text-rosa" : "text-menta"}
          capitalize
        />
        <Resumo
          icon={TrendingUp}
          titulo="Sobra média por mês"
          valor={formatCents(Math.round(totais.resultado.reduce((s, v) => s + v, 0) / Math.max(1, meses.length)))}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Saldo previsto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Saldo de hoje + entradas − contas fixas − faturas − média de gastos − reserva, mês a mês.
          </p>
        </CardHeader>
        <CardContent>
          <LineChart
            labels={meses.map((m) => m.label)}
            series={[
              { nome: "Saldo acumulado", cor: "#6c4cf0", valores: totais.acumulado },
              { nome: "Resultado do mês", cor: "#0ea88c", tracejada: true, valores: totais.resultado },
            ]}
          />
        </CardContent>
      </Card>

      <SimularCompra
        meses={meses}
        onAdd={(s) => setSimulacoes((l) => [...l, s])}
      />

      {/* Planilha */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Toque num valor para ajustar. Ajustes e simulações ficam só neste aparelho.
          </p>
          {temAjustes && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAjustes({});
                setSimulacoes([]);
              }}
            >
              <RotateCcw /> Limpar ajustes
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-max min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-20 min-w-[180px] bg-muted px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Lançamento
                </th>
                {meses.map((m) => (
                  <th
                    key={m.competencia}
                    className={cn(
                      "min-w-[104px] px-3 py-2.5 text-right text-xs font-semibold capitalize",
                      m.atual ? "bg-violeta/10 text-violeta" : "text-muted-foreground",
                    )}
                  >
                    {m.label}
                    <span className="ml-1 font-normal opacity-60">{m.ano.slice(2)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRUPOS.map((g) => {
                const doGrupo = linhas.filter((l) => l.grupo === g.id);
                if (doGrupo.length === 0) return null;
                const aberto = !fechados.has(g.id);
                const Icon = g.icon;
                const tot = totais.porGrupo.get(g.id)!;
                return (
                  <GrupoLinhas key={g.id}>
                    <tr className="border-t border-border bg-card">
                      <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left">
                        <button
                          type="button"
                          onClick={() => alternar(g.id)}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-foreground hover:bg-accent"
                        >
                          <ChevronDown className={cn("size-4 transition-transform", !aberto && "-rotate-90")} />
                          <Icon className={cn("size-4", g.cor)} />
                          {g.titulo}
                        </button>
                      </th>
                      {tot.map((v, i) => (
                        <td
                          key={i}
                          className={cn(
                            "px-3 py-2 text-right font-mono text-sm font-semibold tabular",
                            g.entrada ? "text-menta" : "text-foreground",
                            meses[i].atual && "bg-violeta/5",
                          )}
                        >
                          {v === 0 ? <span className="text-muted-foreground/50">—</span> : formatCompacto(v)}
                        </td>
                      ))}
                    </tr>
                    {aberto &&
                      doGrupo.map((l) => (
                        <tr key={l.id} className="border-t border-border/50">
                          <td className="sticky left-0 z-10 max-w-[220px] bg-card py-1.5 pl-10 pr-3 text-left">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-muted-foreground">{l.rotulo}</span>
                              {l.grupo === "simulacoes" && (
                                <button
                                  type="button"
                                  aria-label={`Remover ${l.rotulo}`}
                                  onClick={() => setSimulacoes((s) => s.filter((x) => x.id !== l.id))}
                                  className="text-muted-foreground hover:text-rosa"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </span>
                          </td>
                          {l.valores.map((v, i) => {
                            const chave = `${l.id}|${i}`;
                            const ajustado = chave in ajustes;
                            const editavel = l.grupo !== "simulacoes";
                            return (
                              <td
                                key={i}
                                className={cn(
                                  "px-1 py-0.5 text-right",
                                  meses[i].atual && "bg-violeta/5",
                                )}
                              >
                                {editando === chave ? (
                                  <input
                                    autoFocus
                                    inputMode="decimal"
                                    defaultValue={formatCentsSemSimbolo(v)}
                                    onBlur={(e) => editarCelula(l.id, i, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                      if (e.key === "Escape") setEditando(null);
                                    }}
                                    className="h-7 w-24 rounded border border-violeta bg-card px-1.5 text-right font-mono text-xs tabular outline-none"
                                  />
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!editavel}
                                    onClick={() => setEditando(chave)}
                                    className={cn(
                                      "w-full rounded px-2 py-1 text-right font-mono text-xs tabular transition-colors",
                                      editavel && "hover:bg-accent",
                                      ajustado ? "font-semibold text-violeta" : "text-foreground/80",
                                      l.estimado && !ajustado && "italic",
                                    )}
                                    title={ajustado ? "Valor ajustado por você" : l.estimado ? "Estimativa pela média" : undefined}
                                  >
                                    {v === 0 ? <span className="text-muted-foreground/40">—</span> : formatCompacto(v)}
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </GrupoLinhas>
                );
              })}
            </tbody>
            <tfoot>
              <LinhaTotal rotulo="Total de entradas" valores={totais.entradas} meses={meses} cor="text-menta" />
              <LinhaTotal rotulo="Total de saídas" valores={totais.saidas} meses={meses} cor="text-foreground" />
              <LinhaTotal rotulo="Resultado do mês" valores={totais.resultado} meses={meses} sinal />
              <LinhaTotal rotulo="Saldo acumulado" valores={totais.acumulado} meses={meses} sinal destaque />
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

function GrupoLinhas({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function LinhaTotal({
  rotulo,
  valores,
  meses,
  cor,
  sinal,
  destaque,
}: {
  rotulo: string;
  valores: number[];
  meses: Mes[];
  cor?: string;
  sinal?: boolean;
  destaque?: boolean;
}) {
  return (
    <tr className={cn("border-t border-border", destaque ? "bg-violeta/10" : "bg-muted/40")}>
      <th
        className={cn(
          "sticky left-0 z-10 px-4 py-2.5 text-left text-sm font-semibold",
          destaque ? "bg-[#ebe6fd] text-violeta" : "bg-muted text-foreground",
        )}
      >
        {rotulo}
      </th>
      {valores.map((v, i) => (
        <td
          key={i}
          className={cn(
            "px-3 py-2.5 text-right font-mono text-sm font-semibold tabular",
            sinal ? (v < 0 ? "text-rosa" : "text-menta") : cor,
            meses[i].atual && "bg-violeta/5",
          )}
        >
          {formatCompacto(v)}
        </td>
      ))}
    </tr>
  );
}

function Resumo({
  icon: Icon,
  titulo,
  valor,
  cor,
  capitalize,
}: {
  icon: LucideIcon;
  titulo: string;
  valor: string;
  cor?: string;
  capitalize?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" /> {titulo}
        </span>
        <span className={cn("font-mono text-lg font-semibold tabular", capitalize && "capitalize", cor ?? "text-tinta")}>
          {valor}
        </span>
      </CardContent>
    </Card>
  );
}

function SimularCompra({ meses, onAdd }: { meses: Mes[]; onAdd: (s: Simulacao) => void }) {
  const [aberto, setAberto] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [parcelas, setParcelas] = useState("1");
  const [inicio, setInicio] = useState("1");

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseReaisParaCents(valor);
    if (cents <= 0) return toast.error("Informe o valor da compra.");
    onAdd({
      id: `sim-${Date.now()}`,
      descricao: descricao.trim() || "Compra simulada",
      valorCents: cents,
      parcelas: Math.min(48, Math.max(1, Number(parcelas) || 1)),
      inicio: Number(inicio),
    });
    setDescricao("");
    setValor("");
    setParcelas("1");
    toast.success("Simulação adicionada à planilha.");
  }

  return (
    <Card>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-rosa/10 text-rosa">
            <FlaskConical className="size-5" />
          </span>
          <span className="flex flex-col">
            <span className="font-semibold text-foreground">E se eu comprar?</span>
            <span className="text-xs text-muted-foreground">Veja o impacto de uma compra (à vista ou parcelada) antes de fazer.</span>
          </span>
        </span>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", aberto && "rotate-180")} />
      </button>
      {aberto && (
        <form onSubmit={adicionar} className="grid gap-3 border-t border-border p-4 sm:grid-cols-[1fr_140px_90px_140px_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sim-desc">O quê?</Label>
            <Input id="sim-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Geladeira nova" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sim-valor">Valor total</Label>
            <Input id="sim-valor" inputMode="decimal" className="font-mono" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sim-parc">Parcelas</Label>
            <Input id="sim-parc" type="number" min={1} max={48} value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sim-inicio">1ª parcela em</Label>
            <select
              id="sim-inicio"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm capitalize"
            >
              {meses.map((m, i) => (
                <option key={m.competencia} value={i}>
                  {m.label}/{m.ano.slice(2)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">
            <Plus /> Simular
          </Button>
        </form>
      )}
    </Card>
  );
}
