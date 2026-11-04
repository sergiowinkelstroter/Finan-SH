"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";
import { CATEGORIAS_PADRAO } from "@/lib/categorias";

/** Campo livre com sugestões (categorias padrão + as já usadas). */
export function CategoriaInput({
  value,
  onChange,
  sugestoes = [],
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  sugestoes?: string[];
  id?: string;
}) {
  const lista = useId();
  const todas = [...new Set([...CATEGORIAS_PADRAO, ...sugestoes])];
  return (
    <>
      <Input
        id={id}
        list={lista}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Mercado, Lazer…"
        maxLength={40}
        autoComplete="off"
      />
      <datalist id={lista}>
        {todas.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </>
  );
}

export function CheckCompartilhada({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-violeta"
      />
      <span>
        <span className="font-medium text-foreground">Dividir com o casal</span>
        <span className="block text-xs text-muted-foreground">
          Entra no acerto de contas 50/50.
        </span>
      </span>
    </label>
  );
}
