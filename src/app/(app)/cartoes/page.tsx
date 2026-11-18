import { CalendarCheck, CalendarClock, CreditCard, Nfc, Pencil, UserRound, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CartaoFormDialog } from "@/components/cartao-form-dialog";
import { CartaoArquivarButton } from "@/components/cartao-arquivar-button";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, SectionLabel, StatCard } from "@/components/ds";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { listarCartoes } from "@/server/cartoes";
import { getLimiteComprometidoPorCartao } from "@/server/compras";
import { listarUsuarios } from "@/server/usuarios";

export default async function CartoesPage() {
  const [cartoes, usuarios, comprometido] = await Promise.all([
    listarCartoes(),
    listarUsuarios(),
    getLimiteComprometidoPorCartao(),
  ]);

  const ativos = cartoes.filter((c) => c.ativo);
  const arquivados = cartoes.filter((c) => !c.ativo);
  const limiteTotal = ativos.reduce((s, c) => s + (c.limiteCents ?? 0), 0);
  const usadoTotal = ativos.reduce((s, c) => s + (comprometido.get(c.id) ?? 0), 0);

  const tile = (cartao: (typeof cartoes)[number]) => (
    <CartaoTile
      key={cartao.id}
      cartao={cartao}
      usado={comprometido.get(cartao.id) ?? 0}
      acoes={
        <>
          <CartaoFormDialog
            usuarios={usuarios}
            cartao={cartao}
            trigger={
              <Button type="button" variant="ghost" size="sm">
                <Pencil /> Editar
              </Button>
            }
          />
          <CartaoArquivarButton id={cartao.id} ativo={cartao.ativo} />
        </>
      }
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={CreditCard}
        titulo="Cartões"
        subtitulo="Fechamento, vencimento e quanto do limite já está comprometido."
        acoes={<CartaoFormDialog usuarios={usuarios} />}
      />

      {cartoes.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          titulo="Nenhum cartão ainda"
          descricao="Cadastre o primeiro cartão para acompanhar faturas e parcelas."
          acao={<CartaoFormDialog usuarios={usuarios} />}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard icon={CreditCard} titulo="Cartões ativos" valor={String(ativos.length)} />
            <StatCard
              icon={Wallet}
              cor="#e2496b"
              titulo="Comprometido em parcelas"
              valor={formatCents(usadoTotal)}
              detalhe="do mês atual em diante"
            />
            {limiteTotal > 0 && (
              <StatCard
                icon={Wallet}
                cor="#0ea88c"
                titulo="Limite livre"
                valor={formatCents(Math.max(0, limiteTotal - usadoTotal))}
                detalhe={`de ${formatCents(limiteTotal)}`}
                tom="positivo"
                className="col-span-2 lg:col-span-1"
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ativos.map(tile)}</div>

          {arquivados.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionLabel>Arquivados</SectionLabel>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{arquivados.map(tile)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function CartaoTile({
  cartao,
  usado,
  acoes,
}: {
  cartao: Awaited<ReturnType<typeof listarCartoes>>[number];
  usado: number;
  acoes: React.ReactNode;
}) {
  const limite = cartao.limiteCents ?? 0;
  const pct = limite > 0 ? Math.min(100, (usado / limite) * 100) : 0;
  return (
    <div className={cn("flex flex-col gap-2", !cartao.ativo && "opacity-60 grayscale-[40%]")}>
      <div className="relative flex aspect-[1.7/1] max-h-56 flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-violeta via-[#5a3fd6] to-azul p-5 text-white shadow-lg shadow-violeta/25">
        <div className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-16 -left-8 size-44 rounded-full bg-white/5" aria-hidden />

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold">{cartao.nome}</p>
            {cartao.titular && (
              <p className="flex items-center gap-1 text-xs text-white/75">
                <UserRound className="size-3" /> {cartao.titular.nome}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!cartao.ativo && <Badge className="bg-white/20 text-white">arquivado</Badge>}
            <Nfc className="size-6 text-white/80" />
          </div>
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <div className="flex gap-4 text-xs">
            <span className="flex flex-col">
              <span className="flex items-center gap-1 text-white/70">
                <CalendarClock className="size-3" /> fecha
              </span>
              <span className="font-mono font-semibold tabular">dia {cartao.diaFechamento}</span>
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-1 text-white/70">
                <CalendarCheck className="size-3" /> vence
              </span>
              <span className="font-mono font-semibold tabular">dia {cartao.diaVencimento}</span>
            </span>
          </div>
          {cartao.bandeira && (
            <span className="font-display text-sm font-semibold uppercase italic tracking-wider text-white/90">
              {cartao.bandeira}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 px-1">
        {limite > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", pct >= 90 ? "bg-rosa" : "bg-gradient-to-r from-violeta to-azul")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                <span className="font-mono tabular text-foreground">{formatCents(usado)}</span> em parcelas
              </span>
              <span>
                livre <span className="font-mono tabular text-menta">{formatCents(Math.max(0, limite - usado))}</span>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Sem limite cadastrado · <span className="font-mono tabular">{formatCents(usado)}</span> em parcelas
          </p>
        )}
        <div className="-ml-2 flex items-center gap-1">{acoes}</div>
      </div>
    </div>
  );
}
