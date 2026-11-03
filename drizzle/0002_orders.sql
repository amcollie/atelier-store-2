CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('unpaid', 'processing', 'paid', 'failed', 'expired', 'canceled');--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"product_slug" text NOT NULL,
	"product_name" text NOT NULL,
	"size" text,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_order_product_size_unique" UNIQUE NULLS NOT DISTINCT("order_id","product_id","size"),
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_unit_price_non_negative" CHECK ("order_items"."unit_price_cents" >= 0),
	CONSTRAINT "order_items_line_total_matches" CHECK ("order_items"."line_total_cents" = "order_items"."unit_price_cents" * "order_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'unpaid' NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"email" text,
	"shipping" jsonb,
	"reserved_until" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id"),
	CONSTRAINT "orders_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id"),
	CONSTRAINT "orders_currency_format" CHECK ("orders"."currency" ~ '^[a-z]{3}$'),
	CONSTRAINT "orders_amounts_non_negative" CHECK ("orders"."subtotal_cents" >= 0 AND "orders"."shipping_cents" >= 0),
	CONSTRAINT "orders_total_matches" CHECK ("orders"."total_cents" = "orders"."subtotal_cents" + "orders"."shipping_cents"),
	CONSTRAINT "orders_session_id_format" CHECK ("orders"."stripe_checkout_session_id" IS NULL OR "orders"."stripe_checkout_session_id" LIKE 'cs\_%'),
	CONSTRAINT "orders_payment_intent_format" CHECK ("orders"."stripe_payment_intent_id" IS NULL OR "orders"."stripe_payment_intent_id" LIKE 'pi\_%'),
	CONSTRAINT "orders_status_consistent" CHECK (("orders"."status" = 'pending' AND "orders"."payment_status" IN ('unpaid', 'processing'))
       OR ("orders"."status" = 'paid' AND "orders"."payment_status" = 'paid')
       OR ("orders"."status" = 'canceled' AND "orders"."payment_status" IN ('failed', 'expired', 'canceled'))),
	CONSTRAINT "orders_session_before_payment" CHECK ("orders"."payment_status" = 'unpaid' OR "orders"."payment_status" = 'canceled' OR "orders"."stripe_checkout_session_id" IS NOT NULL),
	CONSTRAINT "orders_paid_at_set" CHECK (("orders"."status" = 'paid') = ("orders"."paid_at" IS NOT NULL)),
	CONSTRAINT "orders_canceled_at_set" CHECK (("orders"."status" = 'canceled') = ("orders"."canceled_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"order_id" integer,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_events_id_format" CHECK ("stripe_events"."id" LIKE 'evt\_%')
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_events" ADD CONSTRAINT "stripe_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_items_product_id_idx" ON "order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_status_reserved_idx" ON "orders" USING btree ("status","reserved_until");--> statement-breakpoint
CREATE INDEX "stripe_events_order_id_idx" ON "stripe_events" USING btree ("order_id");