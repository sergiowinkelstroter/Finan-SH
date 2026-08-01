import argon2 from "argon2";

const senha = process.argv[2];

if (!senha) {
  console.error("Uso: npm run hash-password -- \"minha senha longa\"");
  process.exit(1);
}

argon2
  .hash(senha, { type: argon2.argon2id })
  .then((hash) => {
    const escapado = hash.replaceAll("$", "\\$");
    console.log("\nNa Vercel (Settings → Environment Variables), use o valor puro:\n");
    console.log(`SHARED_PASSWORD_HASH=${hash}\n`);
    console.log(
      "Em arquivos .env* locais, escape os '$' (o loader de env do Next.js\n" +
        "expande '$nome' como variável e corrompe o hash silenciosamente):\n",
    );
    console.log(`SHARED_PASSWORD_HASH=${escapado}\n`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
