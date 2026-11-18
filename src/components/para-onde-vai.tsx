import Link from "next/link";
import { AlertCircle, ArrowRight, ChevronRight, Undo2 } from "lucide-react";
import { CategoriaIcone } from "@/components/categoria-icone";
import { CARTAO_SEM_CATEGORIA, COR_LIVRE, COR_RESERVA, LIVRE, RESERVA, SEM_CATEGORIA } from "@/lib/categorias";
import { formatCents, formatPercentual } from "@/lib/money";

interface Fatia {
  nome: string;
  cents: number;
  cor: string;
}

/**
 * "Para onde vai o dinheiro": a renda do mês vira uma barra de 100% dividida
 * entre categorias de gasto, reserva e o que ficou livre. Abaixo, a lista
 * com ícones e o percentual de cada fatia sobre o que entrou.
 */
export function ParaOndeVai({
  entradasCents,
  reservaCents,
  categorias,
  hrefAnalise,
  hrefSemCategoria,
  queryPeriodo,
  creditosCents = 0,
  max = 6,
}: {
  /** Estornos/créditos do cartão: as categorias somam o valor cheio das compras. */
  creditosCents?: number;
  /** Ex.: "mes=2026-11" — cada fatia vira link para a tela da categoria. */
  queryPeriodo?: string;
  entradasCents: number;
  reservaCents: number;
  categorias: Fatia[];
  hrefAnalise: string;
  hrefSemCategoria: string;
  max?: number;
}) {
  const gasto = categorias.reduce((s, c) => s + c.cents, 0);
  const reserva = Math.max(0, reservaCents);
  const creditos = Math.max(0, creditosCents);
  const livre = entradasCents + creditos - gasto - reserva;
  const base = Math.max(entradasCents + creditos, gasto + reserva, 1);

  const top = categorias.slice(0, max);
  const outras = categorias.slice(max).reduce((s, c) => s + c.cents, 0);
  const fatias: Fatia[] = [
    ...top,
    ...(outras > 0 ? [{ nome: "Outras", cents: outras, cor: "#94a3b8" }] : []),
    ...(reserva > 0 ? [{ nome: RESERVA, cents: reserva, cor: COR_RESERVA }] : []),
    ...(livre > 0 ? [{ nome: LIVRE, cents: livre, cor: COR_LIVRE }] : []),
  ];

  const semCategoria = categorias
    .filter((c) => c.nome === SEM_CATEGORIA || c.nome === CARTAO_SEM_CATEGORIA)
    .reduce((s, c) => s + c.cents, 0);
  const pctSemCategoria = gasto > 0 ? semCategoria / gasto : 0;

  if (gasto + reserva === 0 && entradasCents === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nada lançado neste mês ainda. Cadastre entradas e saídas para ver para onde vai o dinheiro.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>De cada R$ 100 que entraram</span>
          {livre < 0 && <span className="font-medium text-rosa">faltaram {formatCents(-livre)}</span>}
        </div>
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
          {fatias.map((f) => (
            <div
              key={f.nome}
              title={`${f.nome}: ${formatCents(f.cents)}`}
              className="h-full border-r-2 border-card last:border-r-0"
              style={{ width: `${(f.cents / base) * 100}%`, background: f.cor }}
            />
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {fatias.map((f) => {
          const pct = f.cents / Math.max(1, entradasCents || base);
          return (
            <li key={f.nome}>
              {(() => {
                const href = queryPeriodo && f.nome !== LIVRE && f.nome !== "Outras"
                  ? `/categoria?nome=${encodeURIComponent(f.nome)}&${queryPeriodo}`
                  : null;
                const conteudo = (
                  <>
              <CategoriaIcone nome={f.nome} cor={f.cor} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-foreground">{f.nome}</span>
                  <span className="shrink-0 font-mono tabular text-tinta">{formatCents(f.cents)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (f.cents / base) * 100)}%`, background: f.cor }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] tabular text-muted-foreground">
                    {formatPercentual(pct)}
                  </span>
                </div>
              </div>
                    {href ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />
                    ) : (
                      <span className="size-4 shrink-0" aria-hidden />
                    )}
                  </>
                );
                return href ? (
                  <Link href={href} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60 active:bg-muted">
                    {conteudo}
                  </Link>
                ) : (
                  <div className="-mx-2 flex items-center gap-3 px-2 py-1.5">{conteudo}</div>
                );
              })()}
            </li>
          );
        })}
      </ul>

      {creditos > 0 && (
        <div className="flex items-center gap-3 rounded-xl bg-menta/5 px-2 py-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-menta/10 text-menta">
            <Undo2 className="size-3.5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-medium text-foreground">Estornos e créditos do cartão</span>
            <span className="text-[11px] leading-tight text-muted-foreground">
              A fatura fechou menor que as compras lançadas. As categorias mostram o valor cheio das compras.
            </span>
          </span>
          <span className="whitespace-nowrap font-mono text-sm font-semibold tabular text-menta">−{formatCents(creditos)}</span>
          <span className="size-4 shrink-0" aria-hidden />
        </div>
      )}

      {pctSemCategoria >= 0.1 && (
        <div className="flex items-start gap-2 rounded-xl bg-[#f59e0b]/10 p-3 text-xs text-[#a16207]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex flex-col gap-1.5">
            <span>
              <strong>{formatPercentual(pctSemCategoria)}</strong> dos gastos ({formatCents(semCategoria)}) estão sem
              categoria. Importe a fatura do cartão para ver cada compra já categorizada.
            </span>
            <span className="flex flex-wrap gap-3 font-semibold">
              <Link href="/importar" className="underline-offset-2 hover:underline">Importar fatura →</Link>
              <Link href={queryPeriodo ? `/categoria?nome=${encodeURIComponent(SEM_CATEGORIA)}&${queryPeriodo}` : hrefSemCategoria} className="underline-offset-2 hover:underline">Categorizar agora</Link>
            </span>
          </span>
        </div>
      )}

      <Link href={hrefAnalise} className="inline-flex items-center gap-1 text-sm font-medium text-violeta hover:underline">
        Ver fluxo completo <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
