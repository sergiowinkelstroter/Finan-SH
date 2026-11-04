"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { recurringExpenses } from "@/db/schema";
import { normalizarCategoria } from "@/lib/categorias";
import { recorrenciaSchema, type RecorrenciaInput } from "@/lib/validation";

function revalidar() {
  revalidatePath("/recorrencias");
  revalidatePath("/saidas");
  revalidatePath("/projecao");
  revalidatePath("/analises");
  revalidatePath("/");
}

export async function salvarRecorrencia(input: RecorrenciaInput) {
  const data = recorrenciaSchema.parse(input);
  if (data.fim && data.fim < data.inicio) throw new Error("O fim é anterior ao início.");
  const values = {
    descricao: data.descricao,
    valorCents: data.valorCents,
    diaMes: data.diaMes,
    categoria: normalizarCategoria(data.categoria),
    pagoPor: data.pagoPor ?? null,
    compartilhada: data.compartilhada ?? true,
    inicio: data.inicio,
    fim: data.fim || null,
    ativo: data.ativo ?? true,
  };
  if (data.id) {
    await db.update(recurringExpenses).set(values).where(eq(recurringExpenses.id, data.id));
  } else {
    await db.insert(recurringExpenses).values(values);
  }
  revalidar();
}

export async function alternarRecorrencia(id: number, ativo: boolean) {
  await db.update(recurringExpenses).set({ ativo }).where(eq(recurringExpenses.id, id));
  revalidar();
}

export async function excluirRecorrencia(id: number) {
  await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id));
  revalidar();
}
