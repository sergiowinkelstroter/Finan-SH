CREATE TABLE "recurring_expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"descricao" text NOT NULL,
	"valor_cents" bigint NOT NULL,
	"dia_mes" smallint NOT NULL,
	"categoria" text,
	"pago_por" integer,
	"compartilhada" boolean DEFAULT true NOT NULL,
	"inicio" date NOT NULL,
	"fim" date,
	"ativo" boolean DEFAULT true NOT NULL,
	"ultima_geracao" date
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "compartilhada" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recorrencia_id" integer;--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "vigencia_inicio" date;--> statement-breakpoint
ALTER TABLE "incomes" ADD COLUMN "vigencia_fim" date;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "categoria" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "compartilhada" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_pago_por_users_id_fk" FOREIGN KEY ("pago_por") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorrencia_id_recurring_expenses_id_fk" FOREIGN KEY ("recorrencia_id") REFERENCES "public"."recurring_expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorrencia_data_unique" UNIQUE("recorrencia_id","data");--> statement-breakpoint
-- Entradas fixas já desativadas passam a terminar no mês anterior ao atual (preserva o histórico mais antigo).
UPDATE "incomes" SET "vigencia_fim" = (date_trunc('month', now())::date - 1) WHERE "tipo" = 'fixa' AND "ativo" = false AND "vigencia_fim" IS NULL;
