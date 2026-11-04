"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  montarPeriodo,
  periodoAnterior,
  periodoDoMes,
  periodoParaQuery,
  periodoProximo,
  presetPeriodo,
  type Periodo,
  type PresetPeriodo,
} from "@/lib/periodo";
import { agoraSaoPaulo } from "@/lib/dates";

const PRESETS: { id: PresetPeriodo; label: string }[] = [
  { id: "mes-atual", label: "Este mês" },
  { id: "mes-passado", label: "Mês passado" },
  { id: "30d", label: "30 dias" },
  { id: "90d", label: "90 dias" },
  { id: "ano", label: "Este ano" },
];

export function SeletorPeriodo({
  periodo,
  permitirIntervalo = true,
}: {
  periodo: Periodo;
  permitirIntervalo?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const atual = useSearchParams();

  function ir(p: Periodo) {
    const params = new URLSearchParams(atual.toString());
    for (const k of ["mes", "de", "ate", "pagina"]) params.delete(k);
    for (const [k, v] of Object.entries(periodoParaQuery(p))) params.set(k, v);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hoje = periodoDoMes(agoraSaoPaulo());
  const eMesAtual = periodo.modo === "mes" && periodo.competencia === hoje.competencia;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      {permitirIntervalo && (
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
          {(["mes", "intervalo"] as const).map((modo) => (
            <button
              key={modo}
              type="button"
              onClick={() =>
                modo === periodo.modo
                  ? undefined
                  : ir(
                      modo === "mes"
                        ? periodoDoMes(parseISO(periodo.de))
                        : montarPeriodo("intervalo", parseISO(periodo.de), parseISO(periodo.ate)),
                    )
              }
              className={cn(
                "rounded-md py-1.5 transition-colors",
                periodo.modo === modo
                  ? "bg-card text-violeta shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {modo === "mes" ? "Mês" : "Intervalo"}
            </button>
          ))}
        </div>
      )}

      {periodo.modo === "mes" ? (
        <div className="flex items-center justify-between gap-2">
          <BotaoSeta direcao="anterior" onClick={() => ir(periodoAnterior(periodo))} />
          <div className="flex flex-1 items-center justify-center gap-2">
            <input
              type="month"
              aria-label="Escolher mês"
              value={periodo.de.slice(0, 7)}
              onChange={(e) => e.target.value && ir(periodoDoMes(parseISO(`${e.target.value}-01`)))}
              className="h-9 rounded-md border border-transparent bg-transparent px-2 text-center font-display text-base font-semibold capitalize text-foreground hover:border-border focus:border-border"
            />
            {!eMesAtual && (
              <button
                type="button"
                onClick={() => ir(hoje)}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-violeta hover:bg-accent"
              >
                Hoje
              </button>
            )}
          </div>
          <BotaoSeta direcao="proximo" onClick={() => ir(periodoProximo(periodo))} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <BotaoSeta direcao="anterior" onClick={() => ir(periodoAnterior(periodo))} />
            <div className="grid flex-1 grid-cols-2 gap-2">
              <CampoData
                label="De"
                value={periodo.de}
                onChange={(v) => ir(montarPeriodo("intervalo", parseISO(v), parseISO(v > periodo.ate ? v : periodo.ate)))}
              />
              <CampoData
                label="Até"
                value={periodo.ate}
                onChange={(v) => ir(montarPeriodo("intervalo", parseISO(v < periodo.de ? v : periodo.de), parseISO(v)))}
              />
            </div>
            <BotaoSeta direcao="proximo" onClick={() => ir(periodoProximo(periodo))} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => ir(presetPeriodo(p.id))}
                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BotaoSeta({ direcao, onClick }: { direcao: "anterior" | "proximo"; onClick: () => void }) {
  const Icon = direcao === "anterior" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direcao === "anterior" ? "Período anterior" : "Próximo período"}
      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent"
    >
      <Icon className="size-4" />
    </button>
  );
}

function CampoData({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted-foreground">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2 text-sm text-foreground"
      />
    </label>
  );
}
