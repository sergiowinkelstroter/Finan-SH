"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { saidaSchema, type SaidaInput } from "@/lib/validation";

export async function salvarSaida(input: SaidaInput) {
  const data = saidaSchema.parse(input);
  const values = {
    descricao: data.descricao,
    valorCents: data.valorCents,
    data: data.data,
    categoria: data.categoria || null,
    pagoPor: data.pagoPor ?? null,
  };

  if (data.id) {
    await db.update(expenses).set(values).where(eq(expenses.id, data.id));
  } else {
    await db.insert(expenses).values(values);
  }

  revalidatePath("/saidas");
  revalidatePath("/");
}

export async function excluirSaida(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidatePath("/saidas");
  revalidatePath("/");
}
