"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { savingsEntries } from "@/db/schema";
import { aporteSchema, type AporteInput } from "@/lib/validation";

export async function registrarAporte(input: AporteInput) {
  const data = aporteSchema.parse(input);
  await db.insert(savingsEntries).values({
    conta: data.conta || "principal",
    data: data.data,
    valorCents: data.valorCents,
    descricao: data.descricao || null,
  });
  revalidatePath("/reserva");
  revalidatePath("/");
}

export async function excluirAporte(id: number) {
  await db.delete(savingsEntries).where(eq(savingsEntries.id, id));
  revalidatePath("/reserva");
  revalidatePath("/");
}
