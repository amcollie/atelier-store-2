CREATE TYPE "public"."order_review_reason" AS ENUM('paid_after_cancel', 'amount_mismatch');--> statement-breakpoint
DROP INDEX "orders_one_open_checkout_per_user";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "review_reason" "order_review_reason";--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "review_flagged_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "reconciled_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_one_open_checkout_per_user" ON "orders" USING btree ("user_id") WHERE "orders"."status" = 'pending' AND "orders"."payment_status" = 'unpaid' AND "orders"."review_reason" IS NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_review_flag_set" CHECK (("orders"."review_reason" IS NULL) = ("orders"."review_flagged_at" IS NULL));