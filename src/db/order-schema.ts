import { relations, sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { products } from "./catalog-schema";

// Orders for Stripe Checkout. An order is created when checkout starts, with
// its stock held, and is settled by Stripe webhooks. Rows are never deleted.
//
// Two explicit, separate states:
// - status: the order's lifecycle. pending holds stock while payment is
//   outstanding; paid keeps it; canceled has returned it to product_stock.
// - payment_status: what Stripe reports for the payment. unpaid = session open;
//   processing = a delayed method (e.g. bank debit) is settling; paid; failed;
//   expired = the Checkout Session timed out; canceled = the shopper backed out.
// CHECK constraints keep the two consistent. Only settle through
// src/lib/orders.ts, which moves both in one conditional statement.

export const orderStatus = pgEnum("order_status", ["pending", "paid", "canceled"]);

export const paymentStatus = pgEnum("payment_status", [
  "unpaid",
  "processing",
  "paid",
  "failed",
  "expired",
  "canceled",
]);

/** Shipping details as Stripe collected them; a snapshot, not a live address book. */
export type OrderShipping = {
  name: string | null;
  phone?: string | null;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
};

export const orders = pgTable(
  "orders",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    /** Random, URL-safe id for links, so order numbers can't be guessed or enumerated. */
    publicId: text("public_id").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),

    status: orderStatus().notNull().default("pending"),
    paymentStatus: paymentStatus("payment_status").notNull().default("unpaid"),

    // Money in integer cents, computed on the server from database prices.
    currency: text().notNull().default("usd"),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),

    // Stripe identifiers. Null until the Checkout Session or PaymentIntent exists.
    stripeCheckoutSessionId: text("stripe_checkout_session_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),

    // Collected by Stripe Checkout, saved when the session completes.
    email: text(),
    shipping: jsonb().$type<OrderShipping>(),

    /** When the stock hold lapses: the Checkout Session's expires_at. */
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("orders_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("orders_status_reserved_idx").on(t.status, t.reservedUntil),
    // At most one open (pending, unpaid) checkout per shopper. Without
    // transactions, this is what stops two checkouts started together from
    // both holding stock: the second insert fails instead.
    uniqueIndex("orders_one_open_checkout_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'pending' AND ${t.paymentStatus} = 'unpaid'`),
    check("orders_currency_format", sql`${t.currency} ~ '^[a-z]{3}$'`),
    check("orders_amounts_non_negative", sql`${t.subtotalCents} >= 0 AND ${t.shippingCents} >= 0`),
    check("orders_total_matches", sql`${t.totalCents} = ${t.subtotalCents} + ${t.shippingCents}`),
    check("orders_session_id_format", sql`${t.stripeCheckoutSessionId} IS NULL OR ${t.stripeCheckoutSessionId} LIKE 'cs\\_%'`),
    check("orders_payment_intent_format", sql`${t.stripePaymentIntentId} IS NULL OR ${t.stripePaymentIntentId} LIKE 'pi\\_%'`),
    // Lifecycle and payment state must agree.
    check(
      "orders_status_consistent",
      sql`(${t.status} = 'pending' AND ${t.paymentStatus} IN ('unpaid', 'processing'))
       OR (${t.status} = 'paid' AND ${t.paymentStatus} = 'paid')
       OR (${t.status} = 'canceled' AND ${t.paymentStatus} IN ('failed', 'expired', 'canceled'))`,
    ),
    // Only Stripe can move a payment past unpaid, so a session must exist by then.
    check(
      "orders_session_before_payment",
      sql`${t.paymentStatus} = 'unpaid' OR ${t.paymentStatus} = 'canceled' OR ${t.stripeCheckoutSessionId} IS NOT NULL`,
    ),
    check("orders_paid_at_set", sql`(${t.status} = 'paid') = (${t.paidAt} IS NOT NULL)`),
    check("orders_canceled_at_set", sql`(${t.status} = 'canceled') = (${t.canceledAt} IS NOT NULL)`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    // Snapshot at checkout, so later catalogue edits never change a past order.
    productSlug: text("product_slug").notNull(),
    productName: text("product_name").notNull(),
    /** Null for one-size and size-less products. */
    size: text(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer().notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("order_items_product_id_idx").on(t.productId),
    // One line per product and size in an order (NULL sizes count as equal).
    // Its leading order_id also serves lookups by order, so no separate index.
    unique("order_items_order_product_size_unique").on(t.orderId, t.productId, t.size).nullsNotDistinct(),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_non_negative", sql`${t.unitPriceCents} >= 0`),
    check("order_items_line_total_matches", sql`${t.lineTotalCents} = ${t.unitPriceCents} * ${t.quantity}`),
  ],
);

/** Stripe webhook events already processed, for deduplication and audit. */
export const stripeEvents = pgTable(
  "stripe_events",
  {
    /** Stripe's event id (evt_…). */
    id: text().primaryKey(),
    type: text().notNull(),
    /** The order the event settled, when it belonged to one of ours. */
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("stripe_events_id_format", sql`${t.id} LIKE 'evt\\_%'`),
    index("stripe_events_order_id_idx").on(t.orderId),
  ],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));
