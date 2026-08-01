"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { incomes } from "@/db/schema";
import { entradaSchema, type EntradaInput } from "@/lib/validation";

export async function salvarEntrada(input: EntradaInput) {
  const data = entradaSchema.parse(input);
  const values = {
    userId: data.userId ?? null,
    descricao: data.descricao,
    valorCents: data.valorCents,
    tipo: data.tipo,
    competencia: data.tipo === "extra" ? data.competencia! : null,
    ativo: data.ativo ?? true,
  };

  if (data.id) {
    await db.update(incomes).set(values).where(eq(incomes.id, data.id));
  } else {
    await db.insert(incomes).values(values);
  }

  revalidatePath("/entradas");
  revalidatePath("/");
}

export async function excluirEntrada(id: number) {
  await db.delete(incomes).where(eq(incomes.id, id));
  revalidatePath("/entradas");
  revalidatePath("/");
}
