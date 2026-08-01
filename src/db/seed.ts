import "dotenv/config";
import { db } from "./index";
import { users, settings } from "./schema";

async function seed() {
  await db
    .insert(users)
    .values([
      { nome: "Sergio", cor: "#6C4CF0" },
      { nome: "Hellen", cor: "#2E6BE6" },
    ])
    .onConflictDoNothing();

  await db
    .insert(settings)
    .values([
      { chave: "teto_padrao_cents", valor: "750000" },
      { chave: "rendimento_aa_padrao", valor: "0" },
    ])
    .onConflictDoNothing();

  console.log("Seed concluído: usuários e configurações padrão criados.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
