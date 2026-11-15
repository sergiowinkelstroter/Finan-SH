import Link from "next/link";
import { ProjecaoInterativa } from "@/components/projecao-interativa";
import { escolha, type SearchParams } from "@/lib/search";
import { getProjecao } from "@/server/projecao";

const HORIZONTES = ["6", "12", "24"] as const;

export default async function ProjecaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const horizonte = escolha(sp.meses, HORIZONTES) ?? "12";
  const projecao = await getProjecao(Number(horizonte));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-foreground lg:text-2xl">Projeção</h1>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm font-medium">
          {HORIZONTES.map((h) => (
            <Link
              key={h}
              href={`/projecao?meses=${h}`}
              className={`rounded-md px-3 py-1 text-center transition-colors ${
                h === horizonte ? "bg-card text-violeta shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {h}m
            </Link>
          ))}
        </div>
      </div>

      <ProjecaoInterativa
        linhas={projecao.linhas}
        estimativas={projecao.estimativasVariaveis}
        proporcaoRestanteMesAtual={projecao.proporcaoRestanteMesAtual}
        horizonte={horizonte}
      />
    </div>
  );
}
