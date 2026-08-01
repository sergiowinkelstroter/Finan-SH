"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cards } from "@/db/schema";
import { cartaoSchema, type CartaoInput } from "@/lib/validation";

export async function criarCartao(input: CartaoInput) {
  const data = cartaoSchema.parse(input);
  await db.insert(cards).values({
    nome: data.nome,
    bandeira: data.bandeira || null,
    titularId: data.titularId ?? null,
    limiteCents: data.limiteCents ?? null,
    diaFechamento: data.diaFechamento,
    diaVencimento: data.diaVencimento,
  });
  revalidatePath("/cartoes");
  revalidatePath("/");
}

export async function editarCartao(id: number, input: CartaoInput) {
  const data = cartaoSchema.parse(input);
  await db
    .update(cards)
    .set({
      nome: data.nome,
      bandeira: data.bandeira || null,
      titularId: data.titularId ?? null,
      limiteCents: data.limiteCents ?? null,
      diaFechamento: data.diaFechamento,
      diaVencimento: data.diaVencimento,
    })
    .where(eq(cards.id, id));
  revalidatePath("/cartoes");
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function arquivarCartao(id: number) {
  await db.update(cards).set({ ativo: false }).where(eq(cards.id, id));
  revalidatePath("/cartoes");
  revalidatePath("/faturas");
  revalidatePath("/");
}

export async function reativarCartao(id: number) {
  await db.update(cards).set({ ativo: true }).where(eq(cards.id, id));
  revalidatePath("/cartoes");
  revalidatePath("/faturas");
  revalidatePath("/");
}
