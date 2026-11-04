import Link from "next/link";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart } from "@/components/charts/bar-chart";
import { LineChart } from "@/components/charts/line-chart";
import { formatCents } from "@/lib/money";
import { escolha, type SearchParams } from "@/lib/search";
import { getProjecao } from "@/server/projecao";

const HORIZONTES = ["6", "12", "24"] as const;

export default async function ProjecaoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const horizonte = escolha(sp.meses, HORIZONTES) ?? "12";
  const { linhas, piorMes, mesesNegativos, totalEntradasCents, totalComprometidoCents } =
    await getProjecao(Number(horizonte));
  const labels = linhas.map((l) => l.labelCurto);
  const saldoFinal = linhas[linhas.length - 1]?.saldoAcumuladoCents ?? 0;

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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Resumo icon={TrendingUp} titulo="Entradas previstas" valor={formatCents(totalEntradasCents)} />
        <Resumo icon={Wallet} titulo="Compromissos" valor={formatCents(totalComprometidoCents)} />
        <Resumo
          icon={saldoFinal < 0 ? TrendingDown : TrendingUp}
          titulo={`Saldo em ${horizonte} meses`}
          valor={formatCents(saldoFinal)}
          cor={saldoFinal < 0 ? "text-rosa" : "text-menta"}
        />
        <Resumo
          icon={TrendingDown}
          titulo="Mês mais apertado"
          valor={piorMes ? piorMes.label : "—"}
          detalhe={piorMes ? formatCents(piorMes.saldoProjetadoCents) : undefined}
          cor={piorMes && piorMes.saldoProjetadoCents < 0 ? "text-rosa" : undefined}
          capitalize
        />
      </div>

      {mesesNegativos > 0 && (
        <p className="rounded-xl border border-rosa/40 bg-rosa/10 p-3 text-sm text-rosa">
          Atenção: em {mesesNegativos} {mesesNegativos === 1 ? "mês" : "meses"} os compromissos superam as entradas.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Entradas × compromissos</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            series={[
              { nome: "Entradas", cor: "#0ea88c" },
              { nome: "Parcelas", cor: "#6c4cf0" },
              { nome: "Recorrentes", cor: "#2e6be6" },
            ]}
            dados={linhas.map((l) => ({
              label: l.labelCurto,
              valores: [l.entradasCents, l.comprometidoCents, l.recorrentesCents],
              destaque: l.atual,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saldo acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart
            labels={labels}
            series={[
              { nome: "Saldo acumulado", cor: "#6c4cf0", valores: linhas.map((l) => l.saldoAcumuladoCents) },
              { nome: "Saldo do mês", cor: "#2e6be6", tracejada: true, valores: linhas.map((l) => l.saldoProjetadoCents) },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Saldo = entradas − parcelas de cartão − recorrências. Não inclui gastos avulsos futuros.
          </p>
        </CardContent>
      </Card>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Mês a mês</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {linhas.map((l) => (
          <Card key={l.competencia} className={l.atual ? "border-violeta/50" : undefined}>
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-base font-semibold capitalize text-foreground">
                  {l.label}
                  {l.atual && <span className="ml-2 text-xs font-normal text-violeta">atual</span>}
                </span>
                <span
                  className={`font-mono text-base font-semibold tabular ${
                    l.saldoProjetadoCents < 0 ? "text-rosa" : "text-menta"
                  }`}
                >
                  {formatCents(l.saldoProjetadoCents)}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <Item rotulo="Entradas" valor={formatCents(l.entradasCents)} />
                <Item rotulo="Teto" valor={formatCents(l.tetoCents)} />
                <Item rotulo="Parcelas" valor={`~${formatCents(l.comprometidoCents)}`} />
                <Item rotulo="Recorrentes" valor={formatCents(l.recorrentesCents)} />
              </dl>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className={`h-full rounded-full ${l.saldoProjetadoCents < 0 ? "bg-rosa" : "bg-violeta"}`}
                  style={{
                    width: `${l.entradasCents > 0 ? Math.min(100, ((l.comprometidoCents + l.recorrentesCents) / l.entradasCents) * 100) : 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {l.entradasCents > 0
                  ? `${Math.round(((l.comprometidoCents + l.recorrentesCents) / l.entradasCents) * 100)}% das entradas já comprometidas`
                  : "Sem entradas previstas"}
              </p>
            </CardContent>
          </Card>
        ))}
        </div>
      </section>
    </div>
  );
}

function Resumo({
  icon: Icon,
  titulo,
  valor,
  detalhe,
  cor,
  capitalize,
}: {
  icon: React.ComponentType<{ className?: string }>;
  titulo: string;
  valor: string;
  detalhe?: string;
  cor?: string;
  capitalize?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3.5" /> {titulo}
        </span>
        <span className={`font-mono text-base font-semibold tabular ${capitalize ? "capitalize" : ""} ${cor ?? "text-tinta"}`}>
          {valor}
        </span>
        {detalhe && <span className={`font-mono text-xs tabular ${cor ?? "text-muted-foreground"}`}>{detalhe}</span>}
      </CardContent>
    </Card>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-mono tabular text-tinta">{valor}</dd>
    </div>
  );
}
