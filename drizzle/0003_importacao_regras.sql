CREATE TABLE "category_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"padrao" text NOT NULL,
	"categoria" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_rules_padrao_unique" UNIQUE("padrao")
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "origem_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "origem_id" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_origem_id_unique" UNIQUE("origem_id");--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_origem_id_unique" UNIQUE("origem_id");