import { Download } from "lucide-react";
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
import { corCategoria } from "@/lib/categorias";
import { competenciaLabelCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo } from "@/lib/periodo";
import { escolha, inteiro, um, type SearchParams } from "@/lib/search";
import { categoriasDeCompras, getComprometidoPorMes, listarCompras } from "@/server/compras";
import { listarCartoes } from "@/server/cartoes";
import { listarUsuarios } from "@/server/usuarios";

const STATUS = ["ativas", "quitadas", "todas"] as const;

export default async function ParcelasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  const status = escolha(sp.status, STATUS);

  const [compras, cartoes, usuarios, comprometidoMapa, usadas] = await Promise.all([
    listarCompras(periodo, {
      q: um(sp.q),
      cardId: inteiro(sp.cartao),
      compradorId: inteiro(sp.comprador),
      categoria: um(sp.categoria),
      status,
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-foreground">Parcelas</h1>
        <CompraFormDialog cartoes={cartoes} usuarios={usuarios} categorias={usadas} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:order-2">
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
          {
            tipo: "select",
            chave: "status",
            label: "Situação",
            opcoes: [
              { valor: "ativas", label: "Em andamento" },
              { valor: "quitadas", label: "Quitadas" },
            ],
          },
          {
            tipo: "select",
            chave: "categoria",
            label: "Categoria",
            opcoes: usadas.map((c) => ({ valor: c, label: c })),
          },
        ]}
      />

      <Card>
        <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
          <Stat rotulo="Compras" valor={String(compras.length)} />
          <Stat rotulo="No período" valor={formatCents(noPeriodo)} />
          <Stat rotulo="Falta pagar" valor={formatCents(restante)} />
        </CardContent>
      </Card>

      </aside>

      <div className="flex flex-col gap-5 lg:order-1">
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

      {compras.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma compra parcelada neste período{sp.q || sp.cartao || sp.status ? " com esses filtros" : ""}.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          {compras.map((c) => {
            const pct = c.qtdParcelas > 0 ? (c.parcelasPagas / c.qtdParcelas) * 100 : 0;
            return (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-medium text-foreground">{c.descricao}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.card.nome}
                        {c.comprador ? ` · ${c.comprador.nome}` : ""} · {c.qtdParcelas}x de{" "}
                        {formatCents(c.installments[0]?.valorCents ?? 0)}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {c.categoria && (
                          <Badge variant="muted">
                            <span className="mr-1 size-1.5 rounded-full" style={{ background: corCategoria(c.categoria) }} />
                            {c.categoria}
                          </Badge>
                        )}
                        {c.quitada && <Badge variant="success">quitada</Badge>}
                        {!c.compartilhada && <Badge variant="outline">individual</Badge>}
                      </div>
                    </div>
                    <span className="shrink-0 font-mono tabular text-tinta">{formatCents(c.valorTotalCents)}</span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Progress value={pct} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {c.parcelasPagas}/{c.qtdParcelas} pagas
                        {c.parcelaNoPeriodo ? ` · parcela ${c.parcelaNoPeriodo} no período` : ""}
                      </span>
                      <span className="font-mono tabular">falta {formatCents(c.restanteCents)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1">
                    <CompraFormDialog
                      cartoes={cartoes}
                      usuarios={usuarios}
                      categorias={usadas}
                      compra={c}
                      trigger={
                        <Button type="button" variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <CompraDeleteButton id={c.id} descricao={c.descricao} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          <a
            href={`/api/exportar?${exportQuery.toString()}`}
            className="inline-flex items-center justify-center gap-2 self-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            <Download className="size-4" /> Exportar CSV
          </a>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

function Stat({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{rotulo}</span>
      <span className="font-mono text-sm font-semibold tabular text-tinta">{valor}</span>
    </div>
  );
}
