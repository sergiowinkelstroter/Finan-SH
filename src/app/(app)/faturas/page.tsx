import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AtualizarParciaisSheet } from "@/components/atualizar-parciais-sheet";
import { FaturaRow } from "@/components/fatura-row";
import { addMesesCompetencia, competenciaAtualISO, competenciaLabel } from "@/lib/dates";
import { getFaturasDoMes } from "@/server/faturas";

export default async function FaturasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  const competencia = params.mes ?? competenciaAtualISO();
  const faturas = await getFaturasDoMes(competencia, { soAtivos: true });

  const mesAnterior = addMesesCompetencia(competencia, -1);
  const proximoMes = addMesesCompetencia(competencia, 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-foreground">Faturas</h1>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/faturas?mes=${mesAnterior}`}
          className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <span className="font-display text-base font-semibold capitalize text-foreground">
          {competenciaLabel(competencia)}
        </span>
        <Link
          href={`/faturas?mes=${proximoMes}`}
          className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-accent"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {faturas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum cartão ainda. Cadastre o primeiro em Cartões para começar a acompanhar.
        </p>
      ) : (
        <>
          <AtualizarParciaisSheet faturas={faturas} competencia={competencia} />
          <div className="flex flex-col gap-3">
            {faturas.map((f) => (
              <FaturaRow key={f.card.id} fatura={f} competencia={competencia} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
