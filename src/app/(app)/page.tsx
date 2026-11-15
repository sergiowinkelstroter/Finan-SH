import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedidorRitmo } from "@/components/medidor-ritmo";
import { ValorEfetivo } from "@/components/valor-efetivo";
import { AtualizarParciaisSheet } from "@/components/atualizar-parciais-sheet";
import { AlertasVencimento } from "@/components/alertas-vencimento";
import { CardAcerto } from "@/components/card-acerto";
import { VariacaoBadge } from "@/components/variacao-badge";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { DonutChart } from "@/components/charts/donut-chart";
import { competenciaAtualISO, diasDesde, formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import type { SearchParams } from "@/lib/search";
import { um } from "@/lib/search";
import { getResumoMes } from "@/server/dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  // O dashboard é sempre mensal (teto e ritmo são por mês).
  const periodo = parsePeriodo({ mes: um(sp.mes) });
  const resumo = await getResumoMes(periodo.competencia);
  const mesAtual = periodo.competencia === competenciaAtualISO();
  const { analise } = resumo;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-display text-xl font-semibold capitalize text-foreground lg:text-2xl">
          {periodo.label}
        </h1>
        <div className="lg:w-[360px]">
          <SeletorPeriodo periodo={periodo} permitirIntervalo={false} />
        </div>
      </div>

      {mesAtual && <AlertasVencimento alertas={resumo.alertas} />}

      <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
      <section className="rounded-xl border border-border bg-card p-5 lg:p-6">
        <p className="text-sm text-muted-foreground">
          {mesAtual ? "Ainda podem gastar" : resumo.estourouTeto ? "Estourou o teto em" : "Sobrou do teto"}
        </p>
        <p
          className={`mt-1 font-display text-[52px] font-semibold leading-none tabular ${
            resumo.estourouTeto ? "text-rosa" : "text-tinta"
          }`}
        >
          {formatCents(resumo.disponivelCents)}
        </p>
        <div className="mt-2">
          <VariacaoBadge valor={resumo.deltaGasto} sufixo="de gasto vs. mês anterior" />
        </div>

        <div className="mt-5">
          <MedidorRitmo
            pctTeto={resumo.ritmo.pctTeto}
            pctMes={resumo.ritmo.pctMes}
            diaAtual={resumo.diaAtual}
            estourou={resumo.estourouTeto}
          />
        </div>
      </section>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          <ResumoRow label="Entradas" valorCents={resumo.entradasCents} />
          <ResumoRow label="Gasto no mês" valorCents={resumo.gastoCents} tipo={resumo.gastoTipo} />
          <ResumoRow label="  ↳ cartões" valorCents={analise.gastoCartoesCents} sub />
          <ResumoRow label="  ↳ saídas avulsas" valorCents={analise.gastoSaidasCents} sub />
          <ResumoRow label="Teto do mês" valorCents={resumo.tetoCents} />
          <ResumoRow
            label="Sobra (entradas − gasto)"
            valorCents={resumo.sobraCents}
            cor={resumo.sobraCents < 0 ? "text-rosa" : "text-menta"}
          />
          <ResumoRow label="Reserva" valorCents={resumo.reservaAtualCents} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Faturas do mês</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {resumo.faturas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum cartão ainda. Cadastre o primeiro para começar a acompanhar.
            </p>
          ) : (
            <>
              <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {resumo.faturas.map((f) => (
                  <div key={f.card.id} className="flex items-center justify-between gap-3">
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{f.card.nome}</span>
                      <span className="text-xs text-muted-foreground">
                        vence {formatDataCurta(f.vencimento)}
                        {f.invoice?.status === "paga" && " · paga"}
                      </span>
                    </span>
                    <ValorEfetivo
                      valorCents={f.valorCents}
                      tipo={f.tipo}
                      diasDesdeAtualizacao={
                        f.invoice?.parcialAtualizadoEm ? diasDesde(f.invoice.parcialAtualizadoEm) : null
                      }
                    />
                  </div>
                ))}
              </div>
              <AtualizarParciaisSheet
                key={resumo.competencia}
                faturas={resumo.faturas}
                competencia={resumo.competencia}
              />
            </>
          )}
        </CardContent>
      </Card>
      </div>

      <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Para onde foi o dinheiro</CardTitle>
        </CardHeader>
        <CardContent>
          <DonutChart
            fatias={analise.porCategoria}
            centro={{ titulo: "Total", valor: formatCents(analise.gastoCents) }}
          />
          <Link href={`/analises?mes=${periodo.de.slice(0, 7)}`} className="mt-4 inline-block text-sm font-medium text-violeta hover:underline">
            Ver análise completa →
          </Link>
        </CardContent>
      </Card>

      <CardAcerto acerto={analise.acerto} usuarios={analise.usuarios} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Saídas do mês</CardTitle>
          <Link href={`/saidas?mes=${periodo.de.slice(0, 7)}`} className="text-sm font-medium text-violeta hover:underline">
            Ver todas
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          {analise.ultimasSaidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma saída neste mês.</p>
          ) : (
            analise.ultimasSaidas.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-foreground">{s.descricao}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDataCurta(s.data)}
                    {s.categoria ? ` · ${s.categoria}` : ""}
                    {s.virtual ? " · previsão recorrente" : ""}
                  </span>
                </span>
                <span className="font-mono tabular text-tinta">{formatCents(s.valorCents)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comprometido à frente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-2 text-sm">
            {resumo.comprometidoProximosMeses.map((m) => (
              <Link
                key={m.competencia}
                href="/projecao"
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
              >
                <span className="capitalize text-muted-foreground">{m.label}</span>
                <span className="font-mono tabular text-bruma">~{formatCents(m.valorCents)}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}

function ResumoRow({
  label,
  valorCents,
  tipo,
  sub,
  cor,
}: {
  label: string;
  valorCents: number;
  tipo?: "real" | "parcial" | "estimado";
  sub?: boolean;
  cor?: string;
}) {
  return (
    <div className={`flex items-center justify-between px-5 ${sub ? "py-1.5" : "py-3"}`}>
      <span className={`whitespace-pre text-sm ${sub ? "text-xs text-muted-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
      {tipo ? (
        <ValorEfetivo valorCents={valorCents} tipo={tipo} />
      ) : (
        <span className={`font-mono tabular ${sub ? "text-sm text-bruma" : (cor ?? "text-tinta")}`}>
          {formatCents(valorCents)}
        </span>
      )}
    </div>
  );
}
