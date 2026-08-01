# Finanças do casal

App web privado para duas pessoas acompanharem faturas de cartão, compras
parceladas, teto de gastos mensal e reserva financeira. Ver `SPEC.md` (ou o
spec técnico original) para o raciocínio completo por trás de cada decisão.

Stack: Next.js 15 (App Router, Server Actions) · Drizzle ORM · Postgres
(Neon) · Tailwind + shadcn/ui (componentes escritos à mão) · auth por senha
única com JWT (`jose`) + `argon2`.

## Setup

### 1. Banco de dados

Crie um projeto no [Neon](https://neon.tech) (free tier) e copie a
**connection string pooled** (Settings → Connection string → pooled).

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

- `DATABASE_URL` — connection string pooled do Neon.
- `AUTH_SECRET` — gere com `openssl rand -base64 32`.
- `SHARED_PASSWORD_HASH` — gere com o script abaixo.

```bash
npm install
npm run hash-password -- "uma senha longa e única"
```

O script imprime duas versões do hash: uma para colar direto nas variáveis
de ambiente da Vercel, e outra com os `$` escapados (`\$`) para usar em
arquivos `.env*` locais — **o loader de env do Next.js expande `$nome` como
referência de variável e corrompe o hash argon2 silenciosamente se você não
escapar**. Isso só afeta arquivos `.env*` lidos localmente; na Vercel o
valor vai sem escape.

### 3. Schema do banco

```bash
npm run db:push   # aplica o schema direto (bom para desenvolvimento)
npm run db:seed   # cria os usuários Sergio/Hellen e os defaults de settings
```

Para gerar migrations versionadas em vez de `push` direto:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Rodar localmente

```bash
npm run dev
```

Acesse `http://localhost:3000/login` com a senha definida acima. Depois do
login, escolha "Sergio" ou "Hellen" — isso só marca autoria em compras e
saídas, não é controle de acesso.

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm run start` | build e start de produção |
| `npm run lint` | ESLint |
| `npm run db:push` | aplica o schema atual do Drizzle no banco |
| `npm run db:generate` / `db:migrate` | migrations versionadas |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | popula usuários e settings padrão |
| `npm run hash-password -- "senha"` | gera o hash argon2id da senha compartilhada |

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Configure as três variáveis de ambiente (seção acima) no projeto —
   `SHARED_PASSWORD_HASH` vai **sem** escapar os `$` no dashboard da Vercel.
3. Rode `npm run db:push` (ou as migrations) apontando para o banco de
   produção antes do primeiro deploy, e `npm run db:seed` uma vez.

## Estrutura

```
src/
  app/            rotas (App Router) — (app)/ agrupa as telas autenticadas
  components/     componentes React, incluindo src/components/ui (shadcn manual)
  db/             schema Drizzle + conexão Neon + seed
  lib/            cálculos puros, formatação, datas, validação Zod
  server/         acesso a dados (queries) e Server Actions (*-actions.ts)
```

Cada domínio (cartões, faturas, compras, entradas, saídas, orçamento,
reserva) separa **queries** (`src/server/<dominio>.ts`, só leitura, só uso
em Server Components) de **actions** (`src/server/<dominio>-actions.ts`,
mutações com `"use server"` no topo do arquivo, chamáveis de Client
Components). Essa separação existe porque misturar as duas coisas no mesmo
arquivo quebra o build do Next quando um Client Component importa desse
arquivo — o compilador não consegue extrair só as server actions se o
mesmo módulo também tem funções comuns marcadas `server-only`.

## Notas técnicas relevantes

- **Driver do Neon é HTTP, sem transações interativas.** `db.transaction()`
  não existe no driver `neon-http`. A criação de compra parcelada
  (`criarCompra`) precisa inserir a `purchase` e todas as `installments`
  atomicamente — isso é feito obtendo o próximo valor da sequence via
  `nextval()` antes, e enviando todos os inserts num único `db.batch()`
  (que o Neon executa como uma transação real do lado do servidor).
- Dinheiro é sempre inteiro em centavos (`bigint` no banco, `number` no
  TS). Formatação para `R$ 0,00` só acontece em `src/lib/money.ts`.
- Datas de competência e de evento são `date` puro, nunca `timestamp` —
  parseadas sempre com `parseISO` (nunca `new Date(string)`) para não
  deslocar um dia por fuso horário.
