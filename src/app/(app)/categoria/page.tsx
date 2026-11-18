import Link from "next/link";
import { ArrowLeft, CreditCard, FileUp, PartyPopper, PiggyBank, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoriaIcone } from "@/components/categoria-icone";
import { EmptyState, IconBubble, ListCard, ListItem } from "@/components/ds";
import { RecategorizarLista } from "@/components/recategorizar-lista";
import { SeletorPeriodo } from "@/components/seletor-periodo";
import { CARTAO_SEM_CATEGORIA, CATEGORIAS_PADRAO, RESERVA, SEM_CATEGORIA } from "@/lib/categorias";
import { competenciaLabelCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { parsePeriodo, periodoParaQuery } from "@/lib/periodo";
import { um, type SearchParams } from "@/lib/search";
import { getLancamentosCategoria } from "@/server/categoria";
import { categoriasDeCompras } from "@/server/compras";
import { garantirRecorrencias } from "@/server/recorrencias";
import { categoriasDeSaidas } from "@/server/saidas";

export default async function CategoriaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const nome = um(sp.nome)?.trim() || SEM_CATEGORIA;
  const periodo = parsePeriodo({ mes: um(sp.mes) });
  await garantirRecorrencias();
  const [{ itens, faltaNoCartao }, catSaidas, catCompras] = await Promise.all([
    getLancamentosCategoria(periodo, nome),
    categoriasDeSaidas(),
    categoriasDeCompras(),
  ]);
  const categorias = [...new Set([...CATEGORIAS_PADRAO, ...catSaidas, ...catCompras])].sort((a, b) =>
    a.localeCompare(b, "pt-BR"),
  );
  const total =
    nome === CARTAO_SEM_CATEGORIA
      ? faltaNoCartao.reduce((s, f) => s + f.diferencaCents, 0)
      : itens.reduce((s, i) => s + i.valorCents, 0);
  const voltar = `/?${new URLSearchParams(periodoParaQuery(periodo)).toString()}`;

  return (
    <div className="flex flex-col gap-5">
      <Link href={voltar} className="inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Início
      </Link>

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <CategoriaIcone nome={nome} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-semibold text-foreground">{nome}</h1>
            <p className="text-sm capitalize text-muted-foreground">{periodo.label}</p>
          </div>
          <div className="text-right">
            <p className="whitespace-nowrap font-mono text-lg font-semibold tabular text-tinta">{formatCents(total)}</p>
            {nome !== CARTAO_SEM_CATEGORIA && (
              <p className="text-xs text-muted-foreground">
                {itens.length} lançamento{itens.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="lg:max-w-md">
        <SeletorPeriodo periodo={periodo} permitirIntervalo={false} />
      </div>

      {nome === CARTAO_SEM_CATEGORIA ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-3 p-5 text-sm text-foreground">
              <p>
                É a parte da fatura do cartão que <strong>não tem compra lançada</strong> no app: o valor da fatura é
                maior que a soma das compras e parcelas cadastradas. Não dá para categorizar porque o app não sabe o que foi comprado.
              </p>
              <p className="text-muted-foreground">
                Para resolver, importe a fatura do banco: cada compra entra com categoria e essa fatia some.
              </p>
              <Button asChild className="self-start">
                <Link href="/importar"><FileUp /> Importar fatura</Link>
              </Button>
            </CardContent>
          </Card>
          {faltaNoCartao.length > 0 && (
            <ListCard>
              {faltaNoCartao.map((f) => (
                <ListItem
                  key={`${f.cartao}-${f.competencia}`}
                  leading={<IconBubble icon={CreditCard} />}
                  titulo={f.cartao}
                  subtitulo={`fatura ${competenciaLabelCurta(f.competencia)} · ${formatCents(f.faturaCents)} · lançado ${formatCents(f.lancadoCents)}`}
                  trailing={<span className="font-mono text-sm font-semibold tabular text-tinta">{formatCents(f.diferencaCents)}</span>}
                />
              ))}
            </ListCard>
          )}
        </div>
      ) : itens.length === 0 ? (
        <EmptyState
          icon={nome === SEM_CATEGORIA ? PartyPopper : Tag}
          titulo={nome === SEM_CATEGORIA ? "Tudo categorizado!" : "Nada nesta categoria"}
          descricao={nome === SEM_CATEGORIA ? "Nenhum gasto sem categoria neste período." : "Nenhum lançamento neste período."}
        />
      ) : nome === RESERVA ? (
        <>
          <ListCard>
            {itens.map((i) => (
              <ListItem
                key={i.chave}
                leading={<CategoriaIcone nome={RESERVA} />}
                titulo={i.descricao}
                subtitulo={`${i.data.split("-").reverse().join("/")} · ${i.detalhe}`}
                trailing={<span className={`font-mono text-sm font-semibold tabular ${i.valorCents < 0 ? "text-rosa" : "text-menta"}`}>{formatCents(i.valorCents)}</span>}
              />
            ))}
          </ListCard>
          <Button asChild variant="secondary" className="self-start">
            <Link href="/reserva"><PiggyBank /> Ver reserva</Link>
          </Button>
        </>
      ) : (
        <RecategorizarLista itens={itens} categoriaAtual={nome} categorias={categorias} />
      )}
    </div>
  );
}

