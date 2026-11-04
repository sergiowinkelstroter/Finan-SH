-- Remove pessoas duplicadas (o seed rodava a cada build sem restrição de unicidade),
-- mantendo o menor id de cada nome e reapontando as referências antes de criar a restrição.
UPDATE "cards" t SET "titular_id" = k.keep FROM (SELECT id, MIN(id) OVER (PARTITION BY nome) AS keep FROM "users") k WHERE t."titular_id" = k.id AND k.id <> k.keep;--> statement-breakpoint
UPDATE "expenses" t SET "pago_por" = k.keep FROM (SELECT id, MIN(id) OVER (PARTITION BY nome) AS keep FROM "users") k WHERE t."pago_por" = k.id AND k.id <> k.keep;--> statement-breakpoint
UPDATE "incomes" t SET "user_id" = k.keep FROM (SELECT id, MIN(id) OVER (PARTITION BY nome) AS keep FROM "users") k WHERE t."user_id" = k.id AND k.id <> k.keep;--> statement-breakpoint
UPDATE "purchases" t SET "comprador_id" = k.keep FROM (SELECT id, MIN(id) OVER (PARTITION BY nome) AS keep FROM "users") k WHERE t."comprador_id" = k.id AND k.id <> k.keep;--> statement-breakpoint
UPDATE "recurring_expenses" t SET "pago_por" = k.keep FROM (SELECT id, MIN(id) OVER (PARTITION BY nome) AS keep FROM "users") k WHERE t."pago_por" = k.id AND k.id <> k.keep;--> statement-breakpoint
DELETE FROM "users" WHERE id NOT IN (SELECT MIN(id) FROM "users" GROUP BY nome);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_nome_unique" UNIQUE("nome");