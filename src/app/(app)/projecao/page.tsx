import Link from "next/link";
import { LineChart as LineChartIcon, Table2 } from "lucide-react";
import { ProjecaoInterativa } from "@/components/projecao-interativa";
import { AportePlanejadoForm } from "@/components/aporte-planejado-form";
import { PageHeader, SegmentedLinks } from "@/components/ds";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/money";
import { escolha, type SearchParams } from "@/lib/search";
import { getProjecao } from "@/server/projecao";

const HORIZONTES = ["6", "12", "24"] as const;

export default async function ProjecaoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const horizonte = escolha(sp.meses, HORIZONTES) ?? "12";
  const projecao = await getProjecao(Number(horizonte));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={LineChartIcon}
        titulo="Projeção"
        subtitulo="Entradas contra compromissos e gastos estimados nos próximos meses."
        acoes={
          <div className="flex items-center gap-2">
            <Link
              href={`/planilha?meses=${horizonte}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground shadow-card hover:text-foreground"
            >
              <Table2 className="size-4" /> Planilha
            </Link>
            <SegmentedLinks
              ativo={horizonte}
              opcoes={HORIZONTES.map((h) => ({ valor: h, label: `${h}m`, href: `/projecao?meses=${h}` }))}
            />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-1.5 p-4">
          <AportePlanejadoForm valorCents={projecao.aportePlanejadoCents} />
          <p className="text-xs text-muted-foreground">
            A reserva conta como saída do mês. No mês atual vale o maior entre o planejado e o já guardado ({formatCents(projecao.aporteMesAtualCents)}).
          </p>
        </CardContent>
      </Card>

      <ProjecaoInterativa
        linhas={projecao.linhas}
        estimativas={projecao.estimativasVariaveis}
        proporcaoRestanteMesAtual={projecao.proporcaoRestanteMesAtual}
        horizonte={horizonte}
      />
    </div>
  );
}
