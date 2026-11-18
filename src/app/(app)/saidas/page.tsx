import { Download, Pencil, PiggyBank, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaidaDeleteButton } from "@/components/saida-delete-button";
import { SaidaFormDialog } from "@/components/saida-form-dialog";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { FiltroLista } from "@/components/filtro-lista";
import { HBarList } from "@/components/charts/hbar-list";
import { AporteFormDialog } from "@/components/aporte-form-dialog";
import { AporteDeleteButton } from "@/components/aporte-delete-button";
import { CategoriaIcone } from "@/components/categoria-icone";
import { PageHeader } from "@/components/page-header";
import { EmptyState, SectionLabel } from "@/components/ds";
import { CATEGORIAS_PADRAO, COR_RESERVA, RESERVA, SEM_CATEGORIA, corCategoria } from "@/lib/categorias";
import { formatDataCurta, hojeISO } from "@/lib/dates";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCents, parseReaisParaCents } from "@/lib/money";
import { diasDoPeriodo, parsePeriodo } from "@/lib/periodo";
import { escolha, inteiro, um, type SearchParams } from "@/lib/search";
import { garantirRecorrencias } from "@/server/recorrencias";
import { categoriasDeSaidas, listarSaidas } from "@/server/saidas";
import { listarAportesDoPeriodo } from "@/server/reserva";
import { listarUsuarios } from "@/server/usuarios";

const ORDENS = ["data_desc", "data_asc", "valor_desc", "valor_asc"] as const;

export default async function SaidasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const periodo = parsePeriodo({ mes: um(sp.mes), de: um(sp.de), ate: um(sp.ate) });
  const min = um(sp.min);
  const max = um(sp.max);

  await garantirRecorrencias();
  const [saidasBase, usuarios, usadas, aportesPeriodo] = await Promise.all([
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
    listarAportesDoPeriodo(periodo),
  ]);

  // Reserva é saída do mês: aportes entram na lista e resgates devolvem (valor negativo),
  // igual ao "Guardou" do Início.
  const filtroCat = um(sp.categoria);
  const q = um(sp.q)?.trim().toLocaleLowerCase("pt-BR");
  const minC = min ? parseReaisParaCents(min) : null;
  const maxC = max ? parseReaisParaCents(max) : null;
  const incluirReserva = (!filtroCat || filtroCat === RESERVA) && !sp.pagoPor;
  const aportes = incluirReserva
    ? aportesPeriodo
        .filter((a) => !q || (a.descricao ?? "reserva").toLocaleLowerCase("pt-BR").includes(q))
        .filter((a) => (minC == null || Math.abs(a.valorCents) >= minC) && (maxC == null || Math.abs(a.valorCents) <= maxC))
    : [];
  type Item =
    | ({ tipo: "saida" } & (typeof saidasBase)[number])
    | { tipo: "reserva"; id: number; descricao: string; valorCents: number; data: string; categoria: string };
  const saidas: Item[] = [
    ...(filtroCat === RESERVA ? [] : saidasBase.map((s) => ({ tipo: "saida" as const, ...s }))),
    ...aportes.map((a) => ({
      tipo: "reserva" as const,
      id: a.id,
      descricao: a.descricao || (a.valorCents >= 0 ? "Guardado na reserva" : "Resgate da reserva"),
      valorCents: a.valorCents,
      data: a.data,
      categoria: RESERVA,
    })),
  ].sort((a, b) => {
    if (sp.ordem === "data_asc") return a.data.localeCompare(b.data);
    if (sp.ordem === "valor_desc") return b.valorCents - a.valorCents;
    if (sp.ordem === "valor_asc") return a.valorCents - b.valorCents;
    return b.data.localeCompare(a.data);
  });
  const totalReserva = aportes.reduce((s, a) => s + a.valorCents, 0);
  const hoje = hojeISO();
  const rotuloDia = (d: string) =>
    d === hoje ? "Hoje" : d > hoje ? `${format(parseISO(d), "EEEE, dd/MM", { locale: ptBR })} · previsto` : format(parseISO(d), "EEEE, dd/MM", { locale: ptBR });

  const total = saidas.reduce((s, x) => s + x.valorCents, 0);
  const porCategoria = new Map<string, number>();
  for (const s of saidas) {
    const k = s.categoria ?? SEM_CATEGORIA;
    if (s.tipo === "reserva") {
      porCategoria.set(RESERVA, (porCategoria.get(RESERVA) ?? 0) + s.valorCents);
      continue;
    }
    porCategoria.set(k, (porCategoria.get(k) ?? 0) + s.valorCents);
  }
  const ranking = [...porCategoria.entries()]
    .map(([nome, cents]) => ({ nome, cents, cor: nome === RESERVA ? COR_RESERVA : corCategoria(nome) }))
    .filter((c) => c.cents > 0)
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

  const categorias = [...new Set([...CATEGORIAS_PADRAO, ...usadas, RESERVA])];
  const exportQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  exportQuery.set("tipo", "saidas");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        icon={Receipt}
        titulo="Saídas"
        subtitulo="Gastos avulsos, contas fixas e o que foi guardado na reserva."
        acoes={
          <div className="flex items-center gap-2">
            <AporteFormDialog
              trigger={
                <Button variant="secondary">
                  <PiggyBank /> Guardar
                </Button>
              }
            />
            <SaidaFormDialog usuarios={usuarios} categorias={usadas} />
          </div>
        }
      />

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
        <CardContent className="flex flex-col divide-y divide-border/60 p-0">
          <Stat rotulo="Gastos" valor={formatCents(total - totalReserva)} />
          <Stat rotulo="Reserva (líquido)" valor={formatCents(totalReserva)} />
          <Stat rotulo="Gasto médio/dia" valor={formatCents(Math.round((total - totalReserva) / diasDoPeriodo(periodo)))} />
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
        <EmptyState
          icon={Receipt}
          titulo="Nenhuma saída por aqui"
          descricao={
            sp.q || sp.categoria || sp.pagoPor
              ? "Nada encontrado com esses filtros. Tente limpar a busca."
              : "Registre aluguel, mercado, Pix ou o que guardar na reserva neste período."
          }
          acao={<SaidaFormDialog usuarios={usuarios} categorias={usadas} />}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => (
            <section key={g.data || "todos"} className="flex flex-col gap-1.5">
              {g.data && (
                <SectionLabel extra={`${g.total < 0 ? "+" : "−"}${formatCents(Math.abs(g.total))}`}>
                  <span className="normal-case">{rotuloDia(g.data)}</span>
                </SectionLabel>
              )}
              <Card className="divide-y divide-border/60 overflow-hidden">
                {g.itens.map((s) => (
                  <div key={`${s.tipo}-${s.id}`} className="flex items-center gap-3 px-4 py-3">
                    <CategoriaIcone
                      nome={s.tipo === "reserva" ? RESERVA : s.categoria}
                      cor={s.tipo === "reserva" ? COR_RESERVA : undefined}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="line-clamp-2 break-words font-medium leading-snug text-foreground sm:truncate">{s.descricao}</span>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {!g.data && <span>{formatDataCurta(s.data)} ·</span>}
                        {s.tipo === "reserva" ? (
                          <Badge variant={s.valorCents >= 0 ? "success" : "outline"}>{s.valorCents >= 0 ? "reserva" : "resgate"}</Badge>
                        ) : (
                          <>
                            <span>{s.categoria ?? "Sem categoria"}</span>
                            {s.pagador && <span>· {s.pagador.nome}</span>}
                            {s.id < 0 ? <Badge variant="info">previsto</Badge> : s.recorrenciaId && <Badge variant="info">fixa</Badge>}
                            {!s.compartilhada && <Badge variant="outline">individual</Badge>}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <span className={`font-mono text-sm font-semibold tabular ${s.tipo === "reserva" ? "text-menta" : "text-tinta"}`}>
                        {s.valorCents < 0 ? "+" : "−"}
                        {formatCents(Math.abs(s.valorCents))}
                      </span>
                      {s.tipo === "reserva" ? (
                        <AporteDeleteButton id={s.id} descricao={s.descricao} />
                      ) : (
                        s.id >= 0 && (
                          <>
                            <SaidaFormDialog
                              usuarios={usuarios}
                              categorias={usadas}
                              saida={s}
                              trigger={
                                <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Editar ${s.descricao}`}>
                                  <Pencil />
                                </Button>
                              }
                            />
                            <SaidaDeleteButton id={s.id} descricao={s.descricao} />
                          </>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </Card>
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
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className="whitespace-nowrap font-mono text-sm font-semibold tabular text-tinta">{valor}</span>
    </div>
  );
}
