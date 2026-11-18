"use client";

import { useState, useTransition } from "react";
import { BookmarkPlus, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CategoriaIcone } from "@/components/categoria-icone";
import { categorizarPendentes, excluirRegra, salvarRegra } from "@/server/importacao-actions";

export function RegrasCategorizacao({
  regras,
  categorias,
}: {
  regras: { id: number; padrao: string; categoria: string }[];
  categorias: string[];
}) {
  const [padrao, setPadrao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Regras de categoria</CardTitle>
        <p className="text-sm text-muted-foreground">
          Se a descrição contém o texto, a categoria é aplicada sozinha. Elas nascem quando você corrige uma
          categoria na importação — ou crie aqui.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              try {
                await salvarRegra({ padrao, categoria });
                setPadrao("");
                setCategoria("");
                toast.success("Regra salva.");
              } catch {
                toast.error("Preencha o texto (2+ letras) e a categoria.");
              }
            });
          }}
        >
          <Input value={padrao} onChange={(e) => setPadrao(e.target.value)} placeholder="Descrição contém… ex.: IFOOD" aria-label="Texto da regra" />
          <Input list="regra-categorias" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Categoria" aria-label="Categoria da regra" />
          <datalist id="regra-categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Button type="submit" variant="secondary" disabled={pending}>
            <BookmarkPlus /> Adicionar
          </Button>
        </form>

        {regras.length > 0 && (
          <ul className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/70">
            {regras.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                <CategoriaIcone nome={r.categoria} size="sm" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{r.padrao}</span>
                <span className="text-sm text-muted-foreground">{r.categoria}</span>
                <button
                  type="button"
                  aria-label={`Excluir regra ${r.padrao}`}
                  onClick={() => start(() => excluirRegra(r.id))}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-rosa/10 hover:text-rosa"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await categorizarPendentes();
              toast.success(
                r.categorizados
                  ? `${r.categorizados} lançamentos categorizados${r.semCategoria ? ` · ${r.semCategoria} ainda sem categoria` : ""}.`
                  : "Nada novo para categorizar.",
              );
            })
          }
        >
          <Wand2 /> Categorizar o que está sem categoria
        </Button>
      </CardContent>
    </Card>
  );
}
