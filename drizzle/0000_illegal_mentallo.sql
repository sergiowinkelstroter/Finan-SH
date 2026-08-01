CREATE TABLE "budgets" (
	"competencia" date PRIMARY KEY NOT NULL,
	"teto_cents" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"bandeira" text,
	"titular_id" integer,
	"limite_cents" bigint,
	"dia_fechamento" smallint NOT NULL,
	"dia_vencimento" smallint NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dia_fechamento_range" CHECK ("cards"."dia_fechamento" between 1 and 31),
	CONSTRAINT "dia_vencimento_range" CHECK ("cards"."dia_vencimento" between 1 and 31)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"valor_cents" bigint NOT NULL,
	"data" date NOT NULL,
	"categoria" text,
	"pago_por" integer
);
--> statement-breakpoint
CREATE TABLE "incomes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"descricao" text NOT NULL,
	"valor_cents" bigint NOT NULL,
	"tipo" text NOT NULL,
	"competencia" date,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tipo_valid" CHECK ("incomes"."tipo" in ('fixa','extra')),
	CONSTRAINT "competencia_conforme_tipo" CHECK (("incomes"."tipo" = 'fixa' and "incomes"."competencia" is null) or ("incomes"."tipo" = 'extra' and "incomes"."competencia" is not null))
);
--> statement-breakpoint
CREATE TABLE "installments" (
	"id" serial PRIMARY KEY NOT NULL,
	"purchase_id" integer NOT NULL,
	"numero" smallint NOT NULL,
	"competencia" date NOT NULL,
	"valor_cents" bigint NOT NULL,
	CONSTRAINT "installments_purchase_numero_unique" UNIQUE("purchase_id","numero")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"competencia" date NOT NULL,
	"valor_parcial_cents" bigint DEFAULT 0 NOT NULL,
	"parcial_atualizado_em" date,
	"valor_fechado_cents" bigint,
	"status" text DEFAULT 'aberta' NOT NULL,
	"pago_em" date,
	"obs" text,
	CONSTRAINT "invoices_card_competencia_unique" UNIQUE("card_id","competencia"),
	CONSTRAINT "status_valid" CHECK ("invoices"."status" in ('aberta','fechada','paga')),
	CONSTRAINT "fechada_requer_valor" CHECK ("invoices"."status" = 'aberta' or "invoices"."valor_fechado_cents" is not null),
	CONSTRAINT "paga_requer_data" CHECK ("invoices"."status" <> 'paga' or "invoices"."pago_em" is not null)
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"descricao" text NOT NULL,
	"valor_total_cents" bigint NOT NULL,
	"qtd_parcelas" smallint NOT NULL,
	"primeira_competencia" date NOT NULL,
	"comprador_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savings_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"conta" text DEFAULT 'principal' NOT NULL,
	"data" date NOT NULL,
	"valor_cents" bigint NOT NULL,
	"descricao" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"cor" text
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_titular_id_users_id_fk" FOREIGN KEY ("titular_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_pago_por_users_id_fk" FOREIGN KEY ("pago_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incomes" ADD CONSTRAINT "incomes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installments" ADD CONSTRAINT "installments_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_comprador_id_users_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_data_idx" ON "expenses" USING btree ("data");--> statement-breakpoint
CREATE INDEX "installments_competencia_idx" ON "installments" USING btree ("competencia");