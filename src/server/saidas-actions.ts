"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { normalizarCategoria } from "@/lib/categorias";
import { saidaSchema, type SaidaInput } from "@/lib/validation";

function revalidarSaidas() {
  revalidatePath("/saidas");
  revalidatePath("/analises");
  revalidatePath("/");
}

export async function salvarSaida(input: SaidaInput) {
  const data = saidaSchema.parse(input);
  const values = {
    descricao: data.descricao,
    valorCents: data.valorCents,
    data: data.data,
    categoria: normalizarCategoria(data.categoria),
    pagoPor: data.pagoPor ?? null,
    compartilhada: data.compartilhada ?? true,
  };

  if (data.id) {
    await db.update(expenses).set(values).where(eq(expenses.id, data.id));
  } else {
    await db.insert(expenses).values(values);
  }
  revalidarSaidas();
}

export async function excluirSaida(id: number) {
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidarSaidas();
}
