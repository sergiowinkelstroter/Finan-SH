"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampoFiltro =
  | { tipo: "busca"; chave: string; placeholder: string }
  | { tipo: "select"; chave: string; label: string; opcoes: { valor: string; label: string }[] }
  | { tipo: "valor"; chave: string; label: string };

const classeCampo =
  "h-9 w-full min-w-0 rounded-md border border-input bg-card px-2.5 text-sm text-foreground placeholder:text-muted-foreground";

/** Filtros de lista guardados na URL (busca com debounce, selects e faixa de valor). */
export function FiltroLista({ campos }: { campos: CampoFiltro[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const atual = useSearchParams();
  const busca = campos.find((c) => c.tipo === "busca");
  const [texto, setTexto] = useState(busca ? (atual.get(busca.chave) ?? "") : "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function definir(chave: string, valor: string) {
    const params = new URLSearchParams(atual.toString());
    if (valor) params.set(chave, valor);
    else params.delete(chave);
    params.delete("pagina");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const ativos = campos.filter((c) => atual.get(c.chave)).length;

  function limpar() {
    const params = new URLSearchParams(atual.toString());
    for (const c of campos) params.delete(c.chave);
    setTexto("");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const outros = campos.filter((c) => c.tipo !== "busca");

  return (
    <div className="flex flex-col gap-2">
      {busca && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={texto}
            placeholder={busca.placeholder}
            onChange={(e) => {
              setTexto(e.target.value);
              clearTimeout(timer.current);
              timer.current = setTimeout(() => definir(busca.chave, e.target.value.trim()), 350);
            }}
            className={cn(classeCampo, "pl-9")}
          />
        </div>
      )}
      {outros.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {outros.map((c) =>
            c.tipo === "select" ? (
              <select
                key={c.chave}
                aria-label={c.label}
                value={atual.get(c.chave) ?? ""}
                onChange={(e) => definir(c.chave, e.target.value)}
                className={classeCampo}
              >
                <option value="">{c.label}</option>
                {c.opcoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : c.tipo === "valor" ? (
              <input
                key={c.chave}
                inputMode="decimal"
                aria-label={c.label}
                placeholder={c.label}
                defaultValue={atual.get(c.chave) ?? ""}
                onBlur={(e) => definir(c.chave, e.target.value.trim())}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className={classeCampo}
              />
            ) : null,
          )}
        </div>
      )}
      {ativos > 0 && (
        <button
          type="button"
          onClick={limpar}
          className="inline-flex items-center gap-1 self-start text-xs font-medium text-violeta hover:underline"
        >
          <X className="size-3" /> Limpar {ativos} filtro{ativos > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
