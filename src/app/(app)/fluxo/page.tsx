import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet, Workflow, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { SankeyFluxo } from "@/components/charts/sankey-fluxo";
import { ParaOndeVai } from "@/components/para-onde-vai";
import { CategoriaIcone } from "@/components/categoria-icone";
import { StatCard } from "@/components/ds";
import { SEM_CATEGORIA } from "@/lib/categorias";
import { formatCents, formatPercentual } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import { um, type SearchParams } from "@/lib/search";
import { getAnaliseComparada } from "@/server/analise";
import { garantirRecorrencias } from "@/server/recorrencias";

export default async function FluxoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  await garantirRecorrencias();
  const { atual, categoriasAnterior } = await getAnaliseComparada(periodo);
  const mesQuery = periodo.de.slice(0, 7);
  const base = Math.max(1, atual.entradasCents);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Workflow}
        titulo="Para onde vai o dinheiro"
        subtitulo={<span className="capitalize">{periodo.label}</span>}
      />

      <div className="lg:max-w-md">
        <SeletorPeriodo periodo={periodo} />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={ArrowDownLeft} cor="#0ea88c" titulo="Entrou" valor={atual.entradasCents} />
        <Kpi icon={ArrowUpRight} cor="#e2496b" titulo="Gastou" valor={atual.gastoCents} pct={atual.gastoCents / base} />
        <Kpi icon={PiggyBank} cor="#10b981" titulo="Guardou" valor={atual.reservaCents} pct={atual.reservaCents / base} />
        <Kpi
          icon={Wallet}
          cor={atual.livreCents < 0 ? "#e2496b" : "#6c4cf0"}
          titulo={atual.livreCents < 0 ? "Faltou" : "Ficou livre"}
          valor={atual.livreCents}
          pct={atual.livreCents / base}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo do dinheiro</CardTitle>
          <p className="text-sm text-muted-foreground">
            Das entradas para cartões, saídas avulsas e reserva — e de lá para cada categoria. Passe o dedo/mouse nas faixas.
          </p>
        </CardHeader>
        <CardContent>
          <SankeyFluxo
            entradasCents={atual.entradasCents}
            reservaCents={atual.reservaCents}
            categorias={atual.porCategoriaOrigem}
          />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Divisão da renda</CardTitle>
          </CardHeader>
          <CardContent>
            <ParaOndeVai
              entradasCents={atual.entradasCents}
              reservaCents={atual.reservaCents}
              categorias={atual.porCategoria}
              hrefAnalise={`/analises?mes=${mesQuery}`}
              hrefSemCategoria={`/saidas?mes=${mesQuery}&categoria=${encodeURIComponent(SEM_CATEGORIA)}`}
                queryPeriodo={`mes=${mesQuery}`}
              max={10}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias em detalhe</CardTitle>
            <p className="text-sm text-muted-foreground">Quanto veio do cartão e quanto de saídas avulsas, e a variação vs. período anterior.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {atual.porCategoriaOrigem.length === 0 && <p className="text-sm text-muted-foreground">Sem gastos no período.</p>}
            {atual.porCategoriaOrigem.map((c) => {
              const total = c.cartaoCents + c.saidasCents;
              const anterior = categoriasAnterior.get(c.nome);
              const delta = anterior ? (total - anterior) / anterior : null;
              return (
                <Link
                  key={c.nome}
                  href={`/categoria?nome=${encodeURIComponent(c.nome)}&mes=${mesQuery}`}
                  className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60"
                >
                  <CategoriaIcone nome={c.nome} cor={c.cor} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-foreground">{c.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.cartaoCents > 0 && `cartão ${formatCents(c.cartaoCents)}`}
                      {c.cartaoCents > 0 && c.saidasCents > 0 && " · "}
                      {c.saidasCents > 0 && `avulsas ${formatCents(c.saidasCents)}`}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-sm font-medium tabular text-tinta">{formatCents(total)}</span>
                    {delta != null && Math.abs(delta) >= 0.01 && (
                      <span className={`text-[11px] ${delta > 0 ? "text-rosa" : "text-menta"}`}>
                        {delta > 0 ? "▲" : "▼"} {formatPercentual(Math.abs(delta))}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  cor,
  titulo,
  valor,
  pct,
}: {
  icon: LucideIcon;
  cor: string;
  titulo: string;
  valor: number;
  pct?: number;
}) {
  return (
    <StatCard
      icon={icon}
      cor={cor}
      titulo={titulo}
      valor={formatCents(valor)}
      detalhe={pct != null ? `${formatPercentual(pct)} da renda` : undefined}
    />
  );
}
