"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { installments, purchases } from "@/db/schema";
import { addMesesCompetencia } from "@/lib/dates";
import { gerarValoresParcelas } from "@/lib/calculos";
import { normalizarCategoria } from "@/lib/categorias";
import { compraSchema, type CompraInput } from "@/lib/validation";

function revalidarCompras() {
  revalidatePath("/parcelas");
  revalidatePath("/projecao");
  revalidatePath("/faturas");
  revalidatePath("/analises");
  revalidatePath("/cartoes");
  revalidatePath("/");
}

function montarParcelas(data: ReturnType<typeof compraSchema.parse>, purchaseId: number) {
  const valoresParcelas = gerarValoresParcelas(data.valorTotalCents, data.qtdParcelas);
  return valoresParcelas.map((valorCents, index) =>
    db.insert(installments).values({
      purchaseId,
      numero: index + 1,
      competencia: addMesesCompetencia(data.primeiraCompetencia, index),
      valorCents,
    }),
  );
}

type Lote = Parameters<typeof db.batch>[0];

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

  const inserts = [
    db.insert(purchases).values({
      id: purchaseId,
      cardId: data.cardId,
      descricao: data.descricao,
      valorTotalCents: data.valorTotalCents,
      qtdParcelas: data.qtdParcelas,
      primeiraCompetencia: data.primeiraCompetencia,
      compradorId: data.compradorId ?? null,
      categoria: normalizarCategoria(data.categoria),
      compartilhada: data.compartilhada ?? true,
    }),
    ...montarParcelas(data, purchaseId),
  ];

  await db.batch(inserts as unknown as Lote);
  revalidarCompras();
}

/**
 * Edita a compra e regenera todas as parcelas (valor, quantidade e primeira
 * competência podem ter mudado) numa única transação via db.batch().
 */
export async function editarCompra(input: CompraInput) {
  const data = compraSchema.parse(input);
  if (!data.id) throw new Error("Compra sem id.");
  const id = data.id;

  const lote = [
    db.delete(installments).where(eq(installments.purchaseId, id)),
    db
      .update(purchases)
      .set({
        cardId: data.cardId,
        descricao: data.descricao,
        valorTotalCents: data.valorTotalCents,
        qtdParcelas: data.qtdParcelas,
        primeiraCompetencia: data.primeiraCompetencia,
        compradorId: data.compradorId ?? null,
        categoria: normalizarCategoria(data.categoria),
        compartilhada: data.compartilhada ?? true,
      })
      .where(eq(purchases.id, id)),
    ...montarParcelas(data, id),
  ];

  await db.batch(lote as unknown as Lote);
  revalidarCompras();
}

export async function excluirCompra(id: number) {
  await db.delete(purchases).where(eq(purchases.id, id));
  revalidarCompras();
}
