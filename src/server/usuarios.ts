import "server-only";

import { db } from "@/db";

export async function listarUsuarios() {
  return db.query.users.findMany({ orderBy: (u, { asc }) => [asc(u.id)] });
}
