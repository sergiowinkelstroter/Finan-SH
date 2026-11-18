"use server";

import { inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categoryRules, expenses, purchases, recurringExpenses } from "@/db/schema";
import { chaveEstabelecimento } from "@/lib/categorizacao";
import { normalizarCategoria } from "@/lib/categorias";

const schema = z.object({
  saidas: z.array(z.number().int().positive()).max(1000),
  compras: z.array(z.number().int().positive()).max(1000),
  categoria: z.string().trim().max(60).nullable(),
  lembrarRegra: z.boolean().default(false),
});

/**
 * Muda a categoria de saídas e compras. Saídas de conta fixa também atualizam
 * a recorrência (os próximos meses já nascem certos). Opcionalmente vira regra.
 */
export async function recategorizar(input: z.input<typeof schema>) {
  const d = schema.parse(input);
  const categoria = normalizarCategoria(d.categoria);

  const [saidas, compras] = await Promise.all([
    d.saidas.length
      ? db.select({ id: expenses.id, descricao: expenses.descricao, recorrenciaId: expenses.recorrenciaId }).from(expenses).where(inArray(expenses.id, d.saidas))
      : [],
    d.compras.length
      ? db.select({ id: purchases.id, descricao: purchases.descricao }).from(purchases).where(inArray(purchases.id, d.compras))
      : [],
  ]);

  const recorrencias = [...new Set(saidas.map((s) => s.recorrenciaId).filter((x): x is number => !!x))];
  await Promise.all([
    saidas.length && db.update(expenses).set({ categoria }).where(inArray(expenses.id, saidas.map((s) => s.id))),
    compras.length && db.update(purchases).set({ categoria }).where(inArray(purchases.id, compras.map((c) => c.id))),
    recorrencias.length && db.update(recurringExpenses).set({ categoria }).where(inArray(recurringExpenses.id, recorrencias)),
  ]);

  let regras = 0;
  if (d.lembrarRegra && categoria) {
    const padroes = new Set([...saidas, ...compras].map((x) => chaveEstabelecimento(x.descricao)).filter(Boolean));
    await Promise.all(
      [...padroes].map((padrao) =>
        db.insert(categoryRules).values({ padrao, categoria }).onConflictDoUpdate({ target: categoryRules.padrao, set: { categoria } }),
      ),
    );
    regras = padroes.size;
  }

  for (const p of ["/", "/categoria", "/saidas", "/parcelas", "/faturas", "/analises", "/fluxo", "/projecao", "/planilha", "/recorrencias", "/importar"]) {
    revalidatePath(p);
  }
  return { alterados: saidas.length + compras.length, regras };
}
