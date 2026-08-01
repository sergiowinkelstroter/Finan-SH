"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { budgets, settings } from "@/db/schema";
import { definirTetoSchema, type DefinirTetoInput } from "@/lib/validation";

export async function definirTeto(input: DefinirTetoInput) {
  const data = definirTetoSchema.parse(input);
  await db
    .insert(budgets)
    .values({ competencia: data.competencia, tetoCents: data.tetoCents })
    .onConflictDoUpdate({
      target: budgets.competencia,
      set: { tetoCents: data.tetoCents },
    });
  revalidatePath("/entradas");
  revalidatePath("/");
}

export async function definirTetoPadrao(tetoCents: number) {
  await db
    .insert(settings)
    .values({ chave: "teto_padrao_cents", valor: String(tetoCents) })
    .onConflictDoUpdate({
      target: settings.chave,
      set: { valor: String(tetoCents) },
    });
  revalidatePath("/entradas");
  revalidatePath("/");
}
