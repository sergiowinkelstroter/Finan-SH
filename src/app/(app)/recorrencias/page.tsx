import { CalendarDays, Pencil, Repeat, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoriaIcone } from "@/components/categoria-icone";
import { EmptyState, ListCard, ListItem, PageHeader, SectionLabel, StatCard } from "@/components/ds";
import { RecorrenciaControles } from "@/components/recorrencia-controles";
import { RecorrenciaFormDialog } from "@/components/recorrencia-form-dialog";
import { formatDataCurta } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { categoriasDeSaidas } from "@/server/saidas";
import { listarRecorrencias } from "@/server/recorrencias";
import { listarUsuarios } from "@/server/usuarios";

export default async function RecorrenciasPage() {
  const [lista, usuarios, usadas] = await Promise.all([listarRecorrencias(), listarUsuarios(), categoriasDeSaidas()]);
  const ativas = lista.filter((r) => r.ativo);
  const pausadas = lista.filter((r) => !r.ativo);
  const totalMensal = ativas.reduce((s, r) => s + r.valorCents, 0);

  const linha = (r: (typeof lista)[number]) => (
    <ListItem
      key={r.id}
      muted={!r.ativo}
      leading={<CategoriaIcone nome={r.categoria} />}
      titulo={r.descricao}
      subtitulo={
        <>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" /> dia {r.diaMes}
          </span>
          <span>· desde {formatDataCurta(r.inicio)}</span>
          {r.fim && <span>até {formatDataCurta(r.fim)}</span>}
          {r.categoria && <span>· {r.categoria}</span>}
          {r.pagador && <span>· {r.pagador.nome}</span>}
          {!r.ativo && <Badge variant="muted">pausada</Badge>}
          {!r.compartilhada && <Badge variant="outline">individual</Badge>}
        </>
      }
      trailing={
        <>
          <span className="font-mono text-sm font-semibold tabular text-tinta">{formatCents(r.valorCents)}</span>
          <span className="text-[11px] text-muted-foreground">por mês</span>
        </>
      }
      acoes={
        <>
          <RecorrenciaFormDialog
            usuarios={usuarios}
            categorias={usadas}
            recorrencia={r}
            trigger={
              <Button type="button" variant="ghost" size="sm" aria-label="Editar">
                <Pencil />
              </Button>
            }
          />
          <RecorrenciaControles id={r.id} ativo={r.ativo} descricao={r.descricao} />
        </>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Repeat}
        titulo="Recorrências"
        subtitulo="Contas fixas lançadas sozinhas todo mês em Saídas."
        acoes={<RecorrenciaFormDialog usuarios={usuarios} categorias={usadas} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:max-w-xl">
        <StatCard icon={Repeat} titulo="Ativas" valor={String(ativas.length)} detalhe={pausadas.length ? `${pausadas.length} pausada(s)` : undefined} />
        <StatCard icon={Wallet} cor="#e2496b" titulo="Total por mês" valor={formatCents(totalMensal)} />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Repeat}
          titulo="Nenhuma recorrência ainda"
          descricao="Cadastre aluguel, condomínio, internet, assinaturas… e elas entram em Saídas todo mês."
          acao={<RecorrenciaFormDialog usuarios={usuarios} categorias={usadas} />}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
          {ativas.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionLabel extra={formatCents(totalMensal)}>Ativas</SectionLabel>
              <ListCard>{ativas.map(linha)}</ListCard>
            </section>
          )}
          {pausadas.length > 0 && (
            <section className="flex flex-col gap-2">
              <SectionLabel>Pausadas</SectionLabel>
              <ListCard>{pausadas.map(linha)}</ListCard>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
