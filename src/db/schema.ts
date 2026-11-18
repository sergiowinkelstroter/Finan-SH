import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique("users_nome_unique"),
  cor: text("cor"),
});

export const cards = pgTable(
  "cards",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    bandeira: text("bandeira"),
    titularId: integer("titular_id").references(() => users.id),
    limiteCents: bigint("limite_cents", { mode: "number" }),
    diaFechamento: smallint("dia_fechamento").notNull(),
    diaVencimento: smallint("dia_vencimento").notNull(),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "dia_fechamento_range",
      sql`${table.diaFechamento} between 1 and 31`,
    ),
    check(
      "dia_vencimento_range",
      sql`${table.diaVencimento} between 1 and 31`,
    ),
  ],
);

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    competencia: date("competencia").notNull(),
    valorParcialCents: bigint("valor_parcial_cents", { mode: "number" })
      .notNull()
      .default(0),
    parcialAtualizadoEm: date("parcial_atualizado_em"),
    valorFechadoCents: bigint("valor_fechado_cents", { mode: "number" }),
    status: text("status").notNull().default("aberta"),
    pagoEm: date("pago_em"),
    obs: text("obs"),
  },
  (table) => [
    unique("invoices_card_competencia_unique").on(
      table.cardId,
      table.competencia,
    ),
    check(
      "status_valid",
      sql`${table.status} in ('aberta','fechada','paga')`,
    ),
    check(
      "fechada_requer_valor",
      sql`${table.status} = 'aberta' or ${table.valorFechadoCents} is not null`,
    ),
    check(
      "paga_requer_data",
      sql`${table.status} <> 'paga' or ${table.pagoEm} is not null`,
    ),
  ],
);

export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  valorTotalCents: bigint("valor_total_cents", { mode: "number" }).notNull(),
  qtdParcelas: smallint("qtd_parcelas").notNull(),
  primeiraCompetencia: date("primeira_competencia").notNull(),
  compradorId: integer("comprador_id").references(() => users.id),
  categoria: text("categoria"),
  /** Entra no acerto do casal (divisão 50/50). */
  compartilhada: boolean("compartilhada").notNull().default(true),
  /** Identificador do lançamento no extrato importado (evita importar duas vezes). */
  origemId: text("origem_id").unique("purchases_origem_id_unique"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const installments = pgTable(
  "installments",
  {
    id: serial("id").primaryKey(),
    purchaseId: integer("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    numero: smallint("numero").notNull(),
    competencia: date("competencia").notNull(),
    valorCents: bigint("valor_cents", { mode: "number" }).notNull(),
  },
  (table) => [
    unique("installments_purchase_numero_unique").on(
      table.purchaseId,
      table.numero,
    ),
    index("installments_competencia_idx").on(table.competencia),
  ],
);

export const incomes = pgTable(
  "incomes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    descricao: text("descricao").notNull(),
    valorCents: bigint("valor_cents", { mode: "number" }).notNull(),
    tipo: text("tipo").notNull(),
    competencia: date("competencia"),
    ativo: boolean("ativo").notNull().default(true),
    /** Entradas fixas: primeiro/último dia em que valem (null = sem limite). */
    vigenciaInicio: date("vigencia_inicio"),
    vigenciaFim: date("vigencia_fim"),
  },
  (table) => [
    check("tipo_valid", sql`${table.tipo} in ('fixa','extra')`),
    check(
      "competencia_conforme_tipo",
      sql`(${table.tipo} = 'fixa' and ${table.competencia} is null) or (${table.tipo} = 'extra' and ${table.competencia} is not null)`,
    ),
  ],
);

export const recurringExpenses = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  descricao: text("descricao").notNull(),
  valorCents: bigint("valor_cents", { mode: "number" }).notNull(),
  diaMes: smallint("dia_mes").notNull(),
  categoria: text("categoria"),
  pagoPor: integer("pago_por").references(() => users.id),
  compartilhada: boolean("compartilhada").notNull().default(true),
  inicio: date("inicio").notNull(),
  fim: date("fim"),
  ativo: boolean("ativo").notNull().default(true),
  /** Último mês (dia 1) já materializado em `expenses`. */
  ultimaGeracao: date("ultima_geracao"),
});

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    descricao: text("descricao").notNull(),
    valorCents: bigint("valor_cents", { mode: "number" }).notNull(),
    data: date("data").notNull(),
    categoria: text("categoria"),
    pagoPor: integer("pago_por").references(() => users.id),
    compartilhada: boolean("compartilhada").notNull().default(true),
    recorrenciaId: integer("recorrencia_id").references(
      () => recurringExpenses.id,
      { onDelete: "set null" },
    ),
    /** Identificador do lançamento no extrato importado (evita importar duas vezes). */
    origemId: text("origem_id").unique("expenses_origem_id_unique"),
  },
  (table) => [
    index("expenses_data_idx").on(table.data),
    unique("expenses_recorrencia_data_unique").on(
      table.recorrenciaId,
      table.data,
    ),
  ],
);

export const budgets = pgTable("budgets", {
  competencia: date("competencia").primaryKey(),
  tetoCents: bigint("teto_cents", { mode: "number" }).notNull(),
});

export const savingsEntries = pgTable("savings_entries", {
  id: serial("id").primaryKey(),
  conta: text("conta").notNull().default("principal"),
  data: date("data").notNull(),
  valorCents: bigint("valor_cents", { mode: "number" }).notNull(),
  descricao: text("descricao"),
  /** Saldo que já existia antes de usar o app: compõe o saldo, mas não é saída do mês. */
  inicial: boolean("inicial").notNull().default(false),
});

/** Regras de categorização automática: descrição contém `padrao` → `categoria`. */
export const categoryRules = pgTable("category_rules", {
  id: serial("id").primaryKey(),
  padrao: text("padrao").notNull().unique("category_rules_padrao_unique"),
  categoria: text("categoria").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const settings = pgTable("settings", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  cartoes: many(cards),
  compras: many(purchases),
  entradas: many(incomes),
  saidas: many(expenses),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  titular: one(users, {
    fields: [cards.titularId],
    references: [users.id],
  }),
  invoices: many(invoices),
  compras: many(purchases),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  card: one(cards, {
    fields: [invoices.cardId],
    references: [cards.id],
  }),
}));

export const purchasesRelations = relations(purchases, ({ one, many }) => ({
  card: one(cards, {
    fields: [purchases.cardId],
    references: [cards.id],
  }),
  comprador: one(users, {
    fields: [purchases.compradorId],
    references: [users.id],
  }),
  installments: many(installments),
}));

export const installmentsRelations = relations(installments, ({ one }) => ({
  purchase: one(purchases, {
    fields: [installments.purchaseId],
    references: [purchases.id],
  }),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  pagador: one(users, {
    fields: [expenses.pagoPor],
    references: [users.id],
  }),
}));

export const recurringExpensesRelations = relations(
  recurringExpenses,
  ({ one }) => ({
    pagador: one(users, {
      fields: [recurringExpenses.pagoPor],
      references: [users.id],
    }),
  }),
);
