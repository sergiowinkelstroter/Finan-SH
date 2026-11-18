"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { savingsEntries, settings } from "@/db/schema";
import {
  aporteSchema,
  metaReservaSchema,
  type AporteInput,
  type MetaReservaInput,
} from "@/lib/validation";

export async function registrarAporte(input: AporteInput) {
  const data = aporteSchema.parse(input);
  await db.insert(savingsEntries).values({
    conta: data.conta || "principal",
    data: data.data,
    valorCents: data.valorCents,
    descricao: data.descricao || null,
  });
  revalidatePath("/reserva");
  revalidatePath("/saidas");
  revalidatePath("/");
}

export async function excluirAporte(id: number) {
  await db.delete(savingsEntries).where(eq(savingsEntries.id, id));
  revalidatePath("/reserva");
  revalidatePath("/saidas");
  revalidatePath("/");
}

export async function definirMetaReserva(input: MetaReservaInput) {
  const data = metaReservaSchema.parse(input);
  const grava = (chave: string, valor: string) =>
    db
      .insert(settings)
      .values({ chave, valor })
      .onConflictDoUpdate({ target: settings.chave, set: { valor } });
  await grava("meta_reserva_cents", String(data.metaCents));
  await grava("meta_reserva_prazo", data.metaCents > 0 ? (data.prazo ?? "") : "");
  revalidatePath("/reserva");
  revalidatePath("/");
}

export async function definirAportePlanejado(valorCents: number) {
  const v = Math.max(0, Math.round(Number(valorCents) || 0));
  await db
    .insert(settings)
    .values({ chave: "aporte_planejado_cents", valor: String(v) })
    .onConflictDoUpdate({ target: settings.chave, set: { valor: String(v) } });
  revalidatePath("/projecao");
  revalidatePath("/planilha");
  revalidatePath("/reserva");
  revalidatePath("/");
}
