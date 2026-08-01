import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cards } from "@/db/schema";

export async function listarCartoes(opts: { soAtivos?: boolean } = {}) {
  const rows = await db.query.cards.findMany({
    where: opts.soAtivos ? eq(cards.ativo, true) : undefined,
    orderBy: (c, { asc }) => [asc(c.nome)],
    with: { titular: true },
  });
  return rows;
}

export async function getCartao(id: number) {
  return db.query.cards.findFirst({
    where: eq(cards.id, id),
    with: { titular: true },
  });
}
