"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { hojeISO } from "@/lib/dates";
import {
  atualizarParciaisEmLoteSchema,
  atualizarParcialSchema,
  fecharFaturaSchema,
  marcarFaturaPagaSchema,
  type AtualizarParciaisEmLoteInput,
  type AtualizarParcialInput,
  type FecharFaturaInput,
  type MarcarFaturaPagaInput,
} from "@/lib/validation";

export async function atualizarParcial(input: AtualizarParcialInput) {
  const data = atualizarParcialSchema.parse(input);
  await db
    .insert(invoices)
    .values({
      cardId: data.cardId,
      competencia: data.competencia,
      valorParcialCents: data.valorParcialCents,
      parcialAtualizadoEm: hojeISO(),
    })
    .onConflictDoUpdate({
      target: [invoices.cardId, invoices.competencia],
      set: {
        valorParcialCents: data.valorParcialCents,
        parcialAtualizadoEm: hojeISO(),
      },
    });
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function atualizarParciaisEmLote(
  input: AtualizarParciaisEmLoteInput,
) {
  const data = atualizarParciaisEmLoteSchema.parse(input);
  if (data.itens.length === 0) return;

  const hoje = hojeISO();
  const queries = data.itens.map((item) =>
    db
      .insert(invoices)
      .values({
        cardId: item.cardId,
        competencia: data.competencia,
        valorParcialCents: item.valorParcialCents,
        parcialAtualizadoEm: hoje,
      })
      .onConflictDoUpdate({
        target: [invoices.cardId, invoices.competencia],
        set: {
          valorParcialCents: item.valorParcialCents,
          parcialAtualizadoEm: hoje,
        },
      }),
  );

  await db.batch(
    queries as unknown as [(typeof queries)[number], ...(typeof queries)[number][]],
  );
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function fecharFatura(input: FecharFaturaInput) {
  const data = fecharFaturaSchema.parse(input);
  await db
    .insert(invoices)
    .values({
      cardId: data.cardId,
      competencia: data.competencia,
      valorFechadoCents: data.valorFechadoCents,
      status: "fechada",
    })
    .onConflictDoUpdate({
      target: [invoices.cardId, invoices.competencia],
      set: {
        valorFechadoCents: data.valorFechadoCents,
        status: "fechada",
      },
    });
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function marcarFaturaPaga(input: MarcarFaturaPagaInput) {
  const data = marcarFaturaPagaSchema.parse(input);
  await db
    .update(invoices)
    .set({ status: "paga", pagoEm: data.pagoEm })
    .where(eq(invoices.id, data.id));
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function reabrirFatura(id: number) {
  await db
    .update(invoices)
    .set({ status: "aberta", valorFechadoCents: null, pagoEm: null })
    .where(eq(invoices.id, id));
  revalidatePath("/faturas");
  revalidatePath("/");
}
