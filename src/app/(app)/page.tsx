import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  CreditCard,
  PiggyBank,
  Table2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedidorRitmo } from "@/components/medidor-ritmo";
import { ValorEfetivo } from "@/components/valor-efetivo";
import { AtualizarParciaisSheet } from "@/components/atualizar-parciais-sheet";
import { AlertasVencimento } from "@/components/alertas-vencimento";
import { CardAcerto } from "@/components/card-acerto";
import { VariacaoBadge } from "@/components/variacao-badge";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { AcoesRapidas } from "@/components/acoes-rapidas";
import { ParaOndeVai } from "@/components/para-onde-vai";
import { CategoriaIcone } from "@/components/categoria-icone";
import { getProfile } from "@/lib/auth";
import { SEM_CATEGORIA } from "@/lib/categorias";
import { competenciaAtualISO, diasDesde, formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import type { SearchParams } from "@/lib/search";
import { um } from "@/lib/search";
import { getDadosAcoes } from "@/server/acoes";
import { getResumoMes } from "@/server/dashboard";

function saudacao() {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()),
  );
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  // O dashboard é sempre mensal (teto e ritmo são por mês).
  const periodo = parsePeriodo({ mes: um(sp.mes) });
  const [resumo, perfil, dados] = await Promise.all([
    getResumoMes(periodo.competencia),
    getProfile(),
    getDadosAcoes(),
  ]);
  const mesAtual = periodo.competencia === competenciaAtualISO();
  const { analise } = resumo;
  const mesQuery = periodo.de.slice(0, 7);

  return (
    <div className="flex flex-col gap-5">
      {/* Saudação */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{saudacao()},</p>
          <p className="font-display text-xl font-semibold text-foreground lg:text-2xl">{perfil ?? "casal"}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium capitalize text-muted-foreground shadow-card">
          <CalendarRange className="size-3.5 text-violeta" /> {periodo.label}
        </span>
      </div>

      {/* Destaque do mês */}
      <Card className="p-5 lg:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Wallet className="size-4 text-violeta" />
                {mesAtual ? "Ainda podem gastar" : resumo.estourouTeto ? "Estourou o teto em" : "Sobrou do teto"}
              </p>
              <p
                className={`mt-1.5 font-display text-[40px] font-semibold leading-none tabular sm:text-[48px] ${
                  resumo.estourouTeto ? "text-rosa" : "text-tinta"
                }`}
              >
                {formatCents(resumo.disponivelCents)}
              </p>
              <div className="mt-2">
                <VariacaoBadge valor={resumo.deltaGasto} sufixo="de gasto vs. mês anterior" />
              </div>
            </div>
            <MedidorRitmo
              pctTeto={resumo.ritmo.pctTeto}
              pctMes={resumo.ritmo.pctMes}
              diaAtual={resumo.diaAtual}
              estourou={resumo.estourouTeto}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 lg:w-[360px] lg:grid-cols-1 lg:gap-2.5">
            <MiniStat icon={ArrowDownLeft} cor="#0ea88c" rotulo="Entrou" valor={analise.entradasCents} />
            <MiniStat icon={ArrowUpRight} cor="#e2496b" rotulo="Gastou" valor={analise.gastoCents} />
            <MiniStat icon={PiggyBank} cor="#10b981" rotulo="Guardou" valor={analise.reservaCents} />
          </div>
        </div>
      </Card>

      <AcoesRapidas dados={dados} className="lg:hidden" />

      <div className="lg:max-w-md">
        <SeletorPeriodo periodo={periodo} permitirIntervalo={false} />
      </div>

      {mesAtual && <AlertasVencimento alertas={resumo.alertas} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Para onde vai o dinheiro</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Gastos, reserva e o que ficou livre sobre o que entrou.</p>
              </div>
            </CardHeader>
            <CardContent>
              <ParaOndeVai
                entradasCents={analise.entradasCents}
                reservaCents={analise.reservaCents}
                categorias={analise.porCategoria}
                hrefAnalise={`/fluxo?mes=${mesQuery}`}
                hrefSemCategoria={`/saidas?mes=${mesQuery}&categoria=${encodeURIComponent(SEM_CATEGORIA)}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5 text-violeta" /> Faturas do mês
              </CardTitle>
              <Link href="/faturas" className="text-sm font-medium text-violeta hover:underline">
                Ver todas
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {resumo.faturas.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum cartão ainda. Cadastre o primeiro para começar a acompanhar.
                </p>
              ) : (
                <>
                  <div className="grid gap-2 md:grid-cols-2">
                    {resumo.faturas.map((f) => (
                      <div key={f.card.id} className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violeta to-azul text-white">
                          <CreditCard className="size-[18px]" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{f.card.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            vence {formatDataCurta(f.vencimento)}
                            {f.invoice?.status === "paga" && " · paga ✓"}
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

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Últimas saídas</CardTitle>
              <Link href={`/saidas?mes=${mesQuery}`} className="text-sm font-medium text-violeta hover:underline">
                Ver todas
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {analise.ultimasSaidas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma saída neste mês.</p>
              ) : (
                analise.ultimasSaidas.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl py-2">
                    <CategoriaIcone nome={s.categoria} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-foreground">{s.descricao}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDataCurta(s.data)}
                        {s.categoria ? ` · ${s.categoria}` : ""}
                        {s.id < 0 ? " · previsto" : ""}
                      </span>
                    </span>
                    <span className="font-mono text-sm font-medium tabular text-rosa">−{formatCents(s.valorCents)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Resumo do mês</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 p-2 pt-0">
              <ResumoRow icon={ArrowDownLeft} cor="#0ea88c" label="Entradas" valorCents={resumo.entradasCents} />
              <ResumoRow icon={CreditCard} cor="#6c4cf0" label="Cartões" valorCents={analise.gastoCartoesCents} tipo={resumo.gastoTipo} />
              <ResumoRow icon={ArrowUpRight} cor="#2e6be6" label="Saídas avulsas" valorCents={analise.gastoSaidasCents} />
              <ResumoRow icon={PiggyBank} cor="#10b981" label="Guardado na reserva" valorCents={analise.reservaCents} />
              <div className="mx-3 my-1 border-t border-dashed border-border" />
              <ResumoRow
                icon={Wallet}
                cor={analise.livreCents < 0 ? "#e2496b" : "#0ea88c"}
                label={analise.livreCents < 0 ? "Faltou" : "Livre no mês"}
                valorCents={analise.livreCents}
                destaque
              />
              <p className="px-3 pb-2 text-[11px] text-muted-foreground">
                Teto {formatCents(resumo.tetoCents)} · Reserva total {formatCents(resumo.reservaAtualCents)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Próximos meses</CardTitle>
              <Link href="/planilha" className="inline-flex items-center gap-1 text-sm font-medium text-violeta hover:underline">
                <Table2 className="size-4" /> Planilha
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {resumo.comprometidoProximosMeses.map((m) => {
                const pct = resumo.entradasCents > 0 ? Math.min(1, m.valorCents / resumo.entradasCents) : 0;
                return (
                  <div key={m.competencia} className="flex items-center gap-3 text-sm">
                    <span className="w-10 capitalize text-muted-foreground">{m.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-violeta" style={{ width: `${pct * 100}%` }} />
                    </div>
                    <span className="w-24 text-right font-mono tabular text-bruma">{formatCents(m.valorCents)}</span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">Parcelas de cartão já comprometidas.</p>
              <Link
                href="/planilha"
                className="mt-1 flex items-center justify-between rounded-2xl bg-violeta/10 p-3 text-sm font-medium text-violeta transition-colors hover:bg-violeta/15"
              >
                Ver se vai sobrar ou faltar <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>

          <CardAcerto acerto={analise.acerto} usuarios={analise.usuarios} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, cor, rotulo, valor }: { icon: LucideIcon; cor: string; rotulo: string; valor: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3 lg:flex-row lg:items-center lg:gap-3">
      <span className="flex size-8 items-center justify-center rounded-full" style={{ background: `${cor}1f`, color: cor }}>
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col lg:flex-1 lg:flex-row lg:items-center lg:justify-between">
        <span className="text-[11px] text-muted-foreground lg:text-sm">{rotulo}</span>
        <span className="truncate font-mono text-[13px] font-semibold tabular text-tinta lg:text-base">{formatCents(valor)}</span>
      </span>
    </div>
  );
}

function ResumoRow({
  icon: Icon,
  cor,
  label,
  valorCents,
  tipo,
  destaque,
}: {
  icon: LucideIcon;
  cor: string;
  label: string;
  valorCents: number;
  tipo?: "real" | "parcial" | "estimado";
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
      <span className="flex size-8 items-center justify-center rounded-full" style={{ background: `${cor}1f`, color: cor }}>
        <Icon className="size-4" />
      </span>
      <span className={`flex-1 text-sm ${destaque ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      {tipo ? (
        <ValorEfetivo valorCents={valorCents} tipo={tipo} />
      ) : (
        <span className={`font-mono tabular ${destaque ? "font-semibold" : ""}`} style={destaque ? { color: cor } : undefined}>
          {formatCents(valorCents)}
        </span>
      )}
    </div>
  );
}
