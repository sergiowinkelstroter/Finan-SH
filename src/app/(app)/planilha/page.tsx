import Link from "next/link";
import { LineChart, Table2 } from "lucide-react";
import { PlanilhaFuturo } from "@/components/planilha-futuro";
import { PageHeader } from "@/components/page-header";
import { escolha, type SearchParams } from "@/lib/search";
import { SegmentedLinks } from "@/components/ds";
import { getPlanilha } from "@/server/planilha";
import { garantirRecorrencias } from "@/server/recorrencias";

const HORIZONTES = ["6", "12", "24"] as const;

export default async function PlanilhaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const horizonte = escolha(sp.meses, HORIZONTES) ?? "12";
  await garantirRecorrencias();
  const planilha = await getPlanilha(Number(horizonte));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Table2}
        titulo="Planilha do futuro"
        subtitulo="Veja mês a mês se vai sobrar ou faltar dinheiro."
        acoes={
          <div className="flex items-center gap-2">
            <Link
              href="/projecao"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <LineChart className="size-4" /> Gráficos
            </Link>
            <SegmentedLinks
              ativo={horizonte}
              opcoes={HORIZONTES.map((h) => ({ valor: h, label: `${h}m`, href: `/planilha?meses=${h}` }))}
            />
          </div>
        }
      />
      <PlanilhaFuturo key={horizonte} {...planilha} />
    </div>
  );
}
