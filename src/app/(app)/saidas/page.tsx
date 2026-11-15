import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaidaDeleteButton } from "@/components/saida-delete-button";
import { SaidaFormDialog } from "@/components/saida-form-dialog";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { FiltroLista } from "@/components/filtro-lista";
import { HBarList } from "@/components/charts/hbar-list";
import { CATEGORIAS_PADRAO, SEM_CATEGORIA, corCategoria } from "@/lib/categorias";
import { formatDataCurta } from "@/lib/dates";
import { formatCents, parseReaisParaCents } from "@/lib/money";
import { diasDoPeriodo, parsePeriodo } from "@/lib/periodo";
import { escolha, inteiro, um, type SearchParams } from "@/lib/search";
import { garantirRecorrencias } from "@/server/recorrencias";
import { categoriasDeSaidas, listarSaidas } from "@/server/saidas";
import { listarUsuarios } from "@/server/usuarios";

const ORDENS = ["data_desc", "data_asc", "valor_desc", "valor_asc"] as const;

export default async function SaidasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  const min = um(sp.min);
  const max = um(sp.max);

  await garantirRecorrencias();
  const [saidas, usuarios, usadas] = await Promise.all([
    listarSaidas(periodo, {
      q: um(sp.q),
      categoria: um(sp.categoria),
      pagoPor: inteiro(sp.pagoPor),
      min: min ? parseReaisParaCents(min) : undefined,
      max: max ? parseReaisParaCents(max) : undefined,
      ordem: escolha(sp.ordem, ORDENS),
    }),
    listarUsuarios(),
    categoriasDeSaidas(),
  ]);

  const total = saidas.reduce((s, x) => s + x.valorCents, 0);
  const porCategoria = new Map<string, number>();
  for (const s of saidas) {
    const k = s.categoria ?? SEM_CATEGORIA;
    porCategoria.set(k, (porCategoria.get(k) ?? 0) + s.valorCents);
  }
  const ranking = [...porCategoria.entries()]
    .map(([nome, cents]) => ({ nome, cents, cor: corCategoria(nome) }))
    .sort((a, b) => b.cents - a.cents);

  // Agrupa por dia (a lista já vem ordenada; agrupar só quando ordenada por data)
  const porData = !sp.ordem || String(sp.ordem).startsWith("data");
  const grupos: { data: string; itens: typeof saidas; total: number }[] = [];
  if (porData) {
    for (const s of saidas) {
      const g = grupos[grupos.length - 1];
      if (g && g.data === s.data) {
        g.itens.push(s);
        g.total += s.valorCents;
      } else grupos.push({ data: s.data, itens: [s], total: s.valorCents });
    }
  } else {
    grupos.push({ data: "", itens: saidas, total });
  }

  const categorias = [...new Set([...CATEGORIAS_PADRAO, ...usadas])];
  const exportQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  exportQuery.set("tipo", "saidas");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-foreground">Saídas</h1>
        <SaidaFormDialog usuarios={usuarios} categorias={usadas} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <aside className="flex flex-col gap-5 lg:sticky lg:top-6 lg:order-2">
      <SeletorPeriodo periodo={periodo} />

      <FiltroLista
        campos={[
          { tipo: "busca", chave: "q", placeholder: "Buscar por descrição…" },
          {
            tipo: "select",
            chave: "categoria",
            label: "Categoria",
            opcoes: [...categorias, SEM_CATEGORIA].map((c) => ({ valor: c, label: c })),
          },
          {
            tipo: "select",
            chave: "pagoPor",
            label: "Pago por",
            opcoes: usuarios.map((u) => ({ valor: String(u.id), label: u.nome })),
          },
          { tipo: "valor", chave: "min", label: "Valor mín. (R$)" },
          { tipo: "valor", chave: "max", label: "Valor máx. (R$)" },
          {
            tipo: "select",
            chave: "ordem",
            label: "Ordenar",
            opcoes: [
              { valor: "data_desc", label: "Mais recentes" },
              { valor: "data_asc", label: "Mais antigas" },
              { valor: "valor_desc", label: "Maior valor" },
              { valor: "valor_asc", label: "Menor valor" },
            ],
          },
        ]}
      />

      <Card>
        <CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
          <Stat rotulo="Total" valor={formatCents(total)} />
          <Stat rotulo="Lançamentos" valor={String(saidas.length)} />
          <Stat rotulo="Média/dia" valor={formatCents(Math.round(total / diasDoPeriodo(periodo)))} />
        </CardContent>
      </Card>

      {ranking.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <HBarList itens={ranking.slice(0, 6)} />
          </CardContent>
        </Card>
      )}

      </aside>

      <div className="lg:order-1">
      {saidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma saída neste período{sp.q || sp.categoria || sp.pagoPor ? " com esses filtros" : ""}. Registre
          aluguel, condomínio ou mercado no débito.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => (
            <section key={g.data || "todos"} className="flex flex-col gap-2">
              {g.data && (
                <div className="flex items-center justify-between px-1 text-xs font-medium text-muted-foreground">
                  <span>{formatDataCurta(g.data)}</span>
                  <span className="font-mono tabular">{formatCents(g.total)}</span>
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              {g.itens.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-medium text-foreground">{s.descricao}</span>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {!g.data && <span>{formatDataCurta(s.data)}</span>}
                        {s.categoria && (
                          <Badge variant="muted">
                            <span className="mr-1 size-1.5 rounded-full" style={{ background: corCategoria(s.categoria) }} />
                            {s.categoria}
                          </Badge>
                        )}
                        {s.pagador && <span>· {s.pagador.nome}</span>}
                        {s.id < 0 ? <Badge variant="info">previsão recorrente</Badge> : s.recorrenciaId && <Badge variant="info">recorrente</Badge>}
                        {!s.compartilhada && <Badge variant="outline">individual</Badge>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="font-mono tabular text-tinta">{formatCents(s.valorCents)}</span>
                      {s.id >= 0 && <SaidaFormDialog
                        usuarios={usuarios}
                        categorias={usadas}
                        saida={s}
                        trigger={
                          <Button type="button" variant="ghost" size="sm">
                            Editar
                          </Button>
                        }
                      />}
                      {s.id >= 0 && <SaidaDeleteButton id={s.id} descricao={s.descricao} />}
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            </section>
          ))}
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
