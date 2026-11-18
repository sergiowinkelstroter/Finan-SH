"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings } from "@/db/schema";

/** Saldo atual em conta corrente — ponto de partida da planilha do futuro. */
export async function definirSaldoConta(valorCents: number) {
  const v = Math.round(Number(valorCents) || 0);
  await db
    .insert(settings)
    .values({ chave: "saldo_conta_cents", valor: String(v) })
    .onConflictDoUpdate({ target: settings.chave, set: { valor: String(v) } });
  revalidatePath("/planilha");
}
