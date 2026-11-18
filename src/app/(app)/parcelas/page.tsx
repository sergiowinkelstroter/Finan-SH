import { CalendarClock, Download, Layers, Pencil, ShoppingBag, Wallet } from "lucide-react";
import { CategoriaIcone } from "@/components/categoria-icone";
import { EmptyState, ListCard, PageHeader, SectionLabel, SegmentedLinks, StatCard } from "@/components/ds";
import { addMonths, parseISO, format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CompraFormDialog } from "@/components/compra-form-dialog";
import { CompraDeleteButton } from "@/components/compra-delete-button";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { FiltroLista } from "@/components/filtro-lista";
import { BarChart } from "@/components/charts/bar-chart";
import { competenciaLabelCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import { escolha, inteiro, um, type SearchParams } from "@/lib/search";
import { categoriasDeCompras, getComprometidoPorMes, listarCompras } from "@/server/compras";
import { listarCartoes } from "@/server/cartoes";
import { listarUsuarios } from "@/server/usuarios";

const STATUS = ["ativas", "quitadas", "todas"] as const;
const TIPOS = ["parceladas", "avista"] as const;

export default async function ParcelasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  const status = escolha(sp.status, STATUS);
  const tipo = escolha(sp.compra, TIPOS) ?? "parceladas";
  const avista = tipo === "avista";

  const [compras, cartoes, usuarios, comprometidoMapa, usadas] = await Promise.all([
    listarCompras(periodo, {
      q: um(sp.q),
      cardId: inteiro(sp.cartao),
      compradorId: inteiro(sp.comprador),
      categoria: um(sp.categoria),
      status,
      tipo,
    }),
    listarCartoes({ soAtivos: true }),
    listarUsuarios(),
    getComprometidoPorMes(),
    categoriasDeCompras(),
  ]);

  // Gráfico: do início do período até 12 meses à frente (ou o intervalo, se maior)
  const inicio = periodo.competencia;
  const qtd = Math.max(periodo.competencias.length, 12);
  const meses = Array.from({ length: Math.min(qtd, 24) }, (_, i) =>
    format(addMonths(parseISO(inicio), i), "yyyy-MM-dd"),
  );
  const noPeriodo = compras.reduce((s, c) => s + c.noPeriodoCents, 0);
  const restante = compras.reduce((s, c) => s + c.restanteCents, 0);

  const exportQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  exportQuery.set("tipo", "parcelas");
  exportQuery.set("compra", tipo);
  const hrefTipo = (t: string) => {
    const q = new URLSearchParams(
      Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && k !== "compra" && k !== "status" ? [[k, v]] : [])),
    );
    if (t !== "parceladas") q.set("compra", t);
    const qs = q.toString();
    return `/parcelas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={ShoppingBag}
        titulo="Compras no cartão"
        subtitulo="Compras no cartão: parceladas e à vista. Todas entram na fatura."
        acoes={<CompraFormDialog cartoes={cartoes} usuarios={usuarios} categorias={usadas} />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:order-2">
      <SegmentedLinks
        className="w-full [&>a]:flex-1"
        ativo={tipo}
        opcoes={[
          { valor: "parceladas", label: "Parceladas", href: hrefTipo("parceladas") },
          { valor: "avista", label: "À vista", href: hrefTipo("avista") },
        ]}
      />
      <SeletorPeriodo periodo={periodo} />

      <FiltroLista
        campos={[
          { tipo: "busca", chave: "q", placeholder: "Buscar compra…" },
          {
            tipo: "select",
            chave: "cartao",
            label: "Cartão",
            opcoes: cartoes.map((c) => ({ valor: String(c.id), label: c.nome })),
          },
          {
            tipo: "select",
            chave: "comprador",
            label: "Comprador",
            opcoes: usuarios.map((u) => ({ valor: String(u.id), label: u.nome })),
          },
          ...(avista
            ? []
            : [
                {
                  tipo: "select" as const,
                  chave: "status",
                  label: "Situação",
                  opcoes: [
                    { valor: "ativas", label: "Em andamento" },
                    { valor: "quitadas", label: "Quitadas" },
                  ],
                },
              ]),
          {
            tipo: "select",
            chave: "categoria",
            label: "Categoria",
            opcoes: usadas.map((c) => ({ valor: c, label: c })),
          },
        ]}
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 [&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1">
        <StatCard icon={ShoppingBag} cor="#2e6be6" titulo="Compras" valor={String(compras.length)} />
        <StatCard icon={CalendarClock} cor="#6c4cf0" titulo={avista ? "No período" : "Parcelas no período"} valor={formatCents(noPeriodo)} />
        <StatCard icon={Wallet} cor="#e2496b" titulo={avista ? "Em fatura não paga" : "Falta pagar"} valor={formatCents(restante)} />
      </div>

      </aside>

      <div className="flex flex-col gap-5 lg:order-1">
      {!avista && (
      <Card>
        <CardHeader>
          <CardTitle>Comprometido por mês</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            series={[{ nome: "Parcelas", cor: "#6c4cf0" }]}
            dados={meses.map((c) => ({
              label: competenciaLabelCurta(c),
              valores: [comprometidoMapa.get(c) ?? 0],
              destaque: periodo.competencias.includes(c),
            }))}
          />
        </CardContent>
      </Card>
      )}

      {compras.length === 0 ? (
        <EmptyState
          icon={Layers}
          titulo={avista ? "Nenhuma compra à vista no cartão" : "Nenhuma compra parcelada"}
          descricao={
            avista
              ? `Nada neste período${sp.q || sp.cartao ? " com esses filtros" : ""}. Importe a fatura do cartão para ver cada compra aqui.`
              : `Nada neste período${sp.q || sp.cartao || sp.status ? " com esses filtros" : ""}. Lance uma compra no cartão para acompanhar as parcelas.`
          }
        />
      ) : (
        <section className="flex flex-col gap-2">
          <SectionLabel extra={formatCents(noPeriodo)}>{avista ? "Compras à vista no período" : "Compras no período"}</SectionLabel>
          <ListCard>
            {compras.map((c) => {
              const pct = c.qtdParcelas > 0 ? (c.parcelasPagas / c.qtdParcelas) * 100 : 0;
              return (
                <div key={c.id} className="flex flex-col gap-3 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <CategoriaIcone nome={c.categoria} />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium text-foreground">{c.descricao}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>
                          {c.card.nome}
                          {c.comprador ? ` · ${c.comprador.nome}` : ""}
                        </span>
                        {c.categoria && <Badge variant="muted">{c.categoria}</Badge>}
                        {c.quitada && c.qtdParcelas > 1 && <Badge variant="success">quitada</Badge>}
                        {!c.compartilhada && <Badge variant="outline">individual</Badge>}
                      </span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="font-mono text-sm font-semibold tabular text-tinta">{formatCents(c.valorTotalCents)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.qtdParcelas > 1
                          ? `${c.qtdParcelas}x ${formatCents(c.installments[0]?.valorCents ?? 0)}`
                          : `fatura ${competenciaLabelCurta(c.primeiraCompetencia)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pl-[52px]">
                    {c.qtdParcelas <= 1 ? (
                      <div className="flex flex-1 items-center text-[11px] text-muted-foreground">
                        {c.quitada ? <Badge variant="success">fatura paga</Badge> : <span>entra na fatura de {competenciaLabelCurta(c.primeiraCompetencia)}</span>}
                      </div>
                    ) : (
                    <div className="flex flex-1 flex-col gap-1">
                      <Progress value={pct} />
                      <div className="flex justify-between gap-2 text-[11px] text-muted-foreground">
                        <span>
                          {c.parcelasPagas}/{c.qtdParcelas} pagas
                          {c.parcelaNoPeriodo ? ` · parcela ${c.parcelaNoPeriodo} no período` : ""}
                        </span>
                        <span className="font-mono tabular">falta {formatCents(c.restanteCents)}</span>
                      </div>
                    </div>
                    )}
                    <div className="-mr-2 flex shrink-0 items-center">
                      <CompraFormDialog
                        cartoes={cartoes}
                        usuarios={usuarios}
                        categorias={usadas}
                        compra={c}
                        trigger={
                          <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${c.descricao}`}>
                            <Pencil />
                          </Button>
                        }
                      />
                      <CompraDeleteButton id={c.id} descricao={c.descricao} />
                    </div>
                  </div>
                </div>
              );
            })}
          </ListCard>
          <a
            href={`/api/exportar?${exportQuery.toString()}`}
            className="inline-flex items-center justify-center gap-2 self-center rounded-full bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-violeta/10 hover:text-violeta"
          >
            <Download className="size-4" /> Exportar CSV
          </a>
        </section>
      )}
      </div>
      </div>
    </div>
  );
}
