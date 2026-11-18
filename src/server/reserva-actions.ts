"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
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
  revalidarReserva();
}

export async function excluirAporte(id: number) {
  await db.delete(savingsEntries).where(eq(savingsEntries.id, id));
  revalidarReserva();
}

/** Saídas, análises e projeção dependem do que conta como aporte do mês. */
function revalidarReserva() {
  for (const p of ["/", "/reserva", "/saidas", "/analises", "/fluxo", "/categoria", "/projecao", "/planilha"]) {
    revalidatePath(p);
  }
}

const saldoInicialSchema = z.object({
  valorCents: z.number().int().nonnegative(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

/**
 * Define o saldo que a reserva já tinha antes do app. Fica como um lançamento
 * marcado `inicial`: soma no saldo, mas não vira saída de nenhum mês.
 * Valor zero remove o saldo inicial.
 */
export async function definirSaldoInicial(input: z.input<typeof saldoInicialSchema>) {
  const d = saldoInicialSchema.parse(input);
  const filtro = and(eq(savingsEntries.conta, "principal"), eq(savingsEntries.inicial, true));
  const [existente] = await db.select({ id: savingsEntries.id }).from(savingsEntries).where(filtro).limit(1);
  if (d.valorCents === 0) {
    await db.delete(savingsEntries).where(filtro);
  } else if (existente) {
    await db
      .update(savingsEntries)
      .set({ valorCents: d.valorCents, data: d.data })
      .where(eq(savingsEntries.id, existente.id));
  } else {
    await db.insert(savingsEntries).values({
      conta: "principal",
      data: d.data,
      valorCents: d.valorCents,
      descricao: "Saldo inicial",
      inicial: true,
    });
  }
  revalidarReserva();
}

/** Marca/desmarca um lançamento já feito como saldo inicial (deixa de contar como saída). */
export async function marcarSaldoInicial(id: number, inicial: boolean) {
  await db
    .update(savingsEntries)
    .set({ inicial: z.boolean().parse(inicial) })
    .where(eq(savingsEntries.id, z.number().int().positive().parse(id)));
  revalidarReserva();
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
