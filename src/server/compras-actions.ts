"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { installments, purchases } from "@/db/schema";
import { addMesesCompetencia } from "@/lib/dates";
import { gerarValoresParcelas } from "@/lib/calculos";
import { compraSchema, type CompraInput } from "@/lib/validation";

/**
 * Insere purchase + installments em uma única transação atômica via
 * db.batch() — o driver HTTP do Neon não suporta db.transaction()
 * interativo, então o id da purchase é obtido antes (nextval) para poder
 * montar todo o lote de inserts de uma vez.
 */
export async function criarCompra(input: CompraInput) {
  const data = compraSchema.parse(input);

  const nextvalResult = await db.execute<{ nextval: string }>(
    sql`select nextval(pg_get_serial_sequence('purchases', 'id')) as nextval`,
  );
  const purchaseId = Number(nextvalResult.rows[0].nextval);

  const valoresParcelas = gerarValoresParcelas(
    data.valorTotalCents,
    data.qtdParcelas,
  );

  const inserts = [
    db.insert(purchases).values({
      id: purchaseId,
      cardId: data.cardId,
      descricao: data.descricao,
      valorTotalCents: data.valorTotalCents,
      qtdParcelas: data.qtdParcelas,
      primeiraCompetencia: data.primeiraCompetencia,
      compradorId: data.compradorId ?? null,
    }),
    ...valoresParcelas.map((valorCents, index) =>
      db.insert(installments).values({
        purchaseId,
        numero: index + 1,
        competencia: addMesesCompetencia(data.primeiraCompetencia, index),
        valorCents,
      }),
    ),
  ];

  await db.batch(inserts as unknown as [(typeof inserts)[number], ...(typeof inserts)[number][]]);

  revalidatePath("/parcelas");
  revalidatePath("/projecao");
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function excluirCompra(id: number) {
  await db.delete(purchases).where(eq(purchases.id, id));
  revalidatePath("/parcelas");
  revalidatePath("/projecao");
  revalidatePath("/faturas");
  revalidatePath("/");
}
