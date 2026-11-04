import "server-only";

import { randomBytes } from "node:crypto";

import { and, desc, eq, isNull, notInArray, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";

import { db } from "@/db";
import { type OrderShipping, orders } from "@/db/schema";
import { lineKey, loadLiveProducts, resolveCart } from "@/lib/cart";
import type { CartRef } from "@/lib/cart-types";
import type { OrderSummary, OrderView } from "@/lib/order-types";
import { getStripe } from "@/lib/stripe";

// Orders and stock holds. This module is the only code that writes orders.
//
// neon-http has no interactive transactions, so every change that must be
// atomic is ONE SQL statement:
// - createPendingOrder inserts the order and its items and takes the stock in a
//   single statement. product_stock's CHECK (quantity >= 0) aborts the whole
//   statement if anyone would oversell, under concurrent checkouts too.
// - releaseOrder cancels a pending order and returns its stock in a single
//   statement, guarded by `status = 'pending'`, so replays release nothing.
//
// Payment is confirmed only from Stripe's own data (a verified webhook event,
// or a Checkout Session retrieved from the Stripe API on our server), never
// from anything the browser sends.

const CURRENCY = "usd";

export type CheckoutLine = {
  productId: number;
  slug: string;
  name: string;
  size: string | null;
  sizeLabel?: string;
  image: string;
  unitPriceCents: number;
  quantity: number;
};

export type PendingOrder = { id: number; publicId: string; totalCents: number; lines: CheckoutLine[] };

export type CreateOrderResult =
  | { ok: true; order: PendingOrder }
  | { ok: false; reason: "empty" | "out_of_stock" }
  /** `refs` is the bag corrected to live stock, for the caller to save before the shopper reviews it. */
  | { ok: false; reason: "changed"; refs: CartRef[] };

const newPublicId = () => randomBytes(12).toString("base64url");

/**
 * Revalidates the cart against live prices and stock, then records a pending
 * order and holds its stock. Prices and totals come only from Postgres.
 */
export async function createPendingOrder(userId: string, refs: CartRef[]): Promise<CreateOrderResult> {
  const live = await loadLiveProducts(refs.map((r) => r.slug));
  const cart = resolveCart(refs, live);
  if (cart.lines.length === 0) return { ok: false, reason: "empty" };
  // Any clamped, sold-out or withdrawn line means the bag no longer matches what
  // the shopper saw: send them back to review it rather than charge something else.
  if (cart.lines.some((l) => l.issue || l.qty === 0)) {
    const byKey = new Map(cart.lines.map((l) => [l.key, l]));
    const corrected = refs.flatMap((ref) => {
      const line = byKey.get(lineKey(ref.slug, ref.size));
      if (!line) return []; // product no longer exists
      return [line.qty === 0 ? ref : { ...ref, qty: line.qty }];
    });
    return { ok: false, reason: "changed", refs: corrected };
  }

  const lines: CheckoutLine[] = cart.lines.map((l) => {
    const product = live.get(l.slug)!;
    return {
      productId: product.id,
      slug: l.slug,
      name: l.name,
      size: l.size,
      sizeLabel: l.sizeLabel,
      image: l.image.src,
      unitPriceCents: product.priceCents,
      quantity: l.qty,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const publicId = newPublicId();

  // Sizes share one stock count, so hold stock per product.
  const perProduct = new Map<number, number>();
  for (const l of lines) perProduct.set(l.productId, (perProduct.get(l.productId) ?? 0) + l.quantity);

  const itemValues = sql.join(
    lines.map(
      (l) =>
        sql`(${l.productId}::int, ${l.slug}::text, ${l.name}::text, ${l.size}::text, ${l.unitPriceCents}::int, ${l.quantity}::int)`,
    ),
    sql`, `,
  );
  const stockValues = sql.join(
    [...perProduct].map(([productId, qty]) => sql`(${productId}::int, ${qty}::int)`),
    sql`, `,
  );

  let row: { id: number; held: number } | undefined;
  try {
    const result = await db.execute<{ id: number; held: number }>(sql`
      WITH new_order AS (
        INSERT INTO orders (public_id, user_id, status, payment_status, currency, subtotal_cents, shipping_cents, total_cents)
        VALUES (${publicId}, ${userId}, 'pending', 'unpaid', ${CURRENCY}, ${subtotal}, 0, ${subtotal})
        RETURNING id
      ),
      new_items AS (
        INSERT INTO order_items (order_id, product_id, product_slug, product_name, size, unit_price_cents, quantity, line_total_cents)
        SELECT new_order.id, v.product_id, v.slug, v.name, v.size, v.unit_price, v.qty, v.unit_price * v.qty
        FROM new_order, (VALUES ${itemValues}) AS v(product_id, slug, name, size, unit_price, qty)
        RETURNING 1
      ),
      held AS (
        UPDATE product_stock s
        SET quantity = s.quantity - r.qty, updated_at = now()
        FROM (VALUES ${stockValues}) AS r(product_id, qty)
        WHERE s.product_id = r.product_id
        RETURNING s.product_id
      )
      SELECT new_order.id, (SELECT count(*) FROM held)::int AS held FROM new_order
    `);
    row = result.rows[0];
  } catch (error) {
    if (isConstraint(error, "product_stock_quantity_non_negative")) return { ok: false, reason: "out_of_stock" };
    throw error;
  }
  if (!row) throw new Error("Order insert returned no row.");

  // A product without a stock row can't be held; undo rather than sell it.
  if (row.held !== perProduct.size) {
    await releaseOrder(row.id, "canceled");
    return { ok: false, reason: "out_of_stock" };
  }

  revalidateTag("catalog", "max");
  return { ok: true, order: { id: row.id, publicId, totalCents: subtotal, lines } };
}

/** Records the Checkout Session that pays for a pending order. */
export async function attachCheckoutSession(orderId: number, session: Stripe.Checkout.Session): Promise<void> {
  await db
    .update(orders)
    .set({ stripeCheckoutSessionId: session.id, reservedUntil: new Date(session.expires_at * 1000) })
    .where(and(eq(orders.id, orderId), eq(orders.status, "pending"), eq(orders.paymentStatus, "unpaid")));
}

type CancelReason = "failed" | "expired" | "canceled";

/**
 * Cancels a pending order and returns its stock, in one statement. Does nothing
 * (and returns false) if the order is no longer pending, so it's safe to repeat.
 */
export async function releaseOrder(orderId: number, reason: CancelReason): Promise<boolean> {
  const result = await db.execute<{ released: number }>(sql`
    WITH canceled AS (
      UPDATE orders
      SET status = 'canceled', payment_status = ${reason}::payment_status, canceled_at = now(), updated_at = now()
      WHERE id = ${orderId} AND status = 'pending'
      RETURNING id
    ),
    restocked AS (
      UPDATE product_stock s
      SET quantity = s.quantity + i.qty, updated_at = now()
      FROM (
        SELECT product_id, sum(quantity)::int AS qty
        FROM order_items
        WHERE order_id IN (SELECT id FROM canceled)
        GROUP BY product_id
      ) AS i
      WHERE s.product_id = i.product_id
      RETURNING s.product_id
    )
    SELECT (SELECT count(*) FROM canceled)::int AS released
  `);
  const released = (result.rows[0]?.released ?? 0) > 0;
  if (released) revalidateTag("catalog", "max");
  return released;
}

export type SyncOutcome = "paid" | "processing" | "released" | "unchanged" | "amount_mismatch";

/**
 * Applies a Checkout Session's state, as reported by Stripe, to its order.
 * Shared by the webhook and the return routes, and idempotent: each change is a
 * conditional update from the states it may leave, so repeats and out-of-order
 * events change nothing. `session` must come from Stripe (a verified event or
 * an API retrieve), never from the browser.
 */
export async function syncOrderFromSession(
  session: Stripe.Checkout.Session,
  options: { paymentFailed?: boolean; canceledByShopper?: boolean } = {},
): Promise<{ orderId: number; outcome: SyncOutcome } | null> {
  const columns = { id: true, publicId: true, status: true, paymentStatus: true, totalCents: true, currency: true } as const;
  let order = await db.query.orders.findFirst({ where: eq(orders.stripeCheckoutSessionId, session.id), columns });
  const publicId = session.metadata?.order_public_id;
  if (!order && publicId) {
    // The session was created but saving its id failed: link it now, only to an order with no session yet.
    const [linked] = await db
      .update(orders)
      .set({ stripeCheckoutSessionId: session.id, reservedUntil: new Date(session.expires_at * 1000) })
      .where(and(eq(orders.publicId, publicId), isNull(orders.stripeCheckoutSessionId)))
      .returning({ id: orders.id });
    if (linked) order = await db.query.orders.findFirst({ where: eq(orders.id, linked.id), columns });
  }
  // Not one of ours (another integration on the account, or a `stripe trigger` fixture).
  if (!order || publicId !== order.publicId) return null;

  const result = (outcome: SyncOutcome) => ({ orderId: order.id, outcome });

  if (session.status === "expired") {
    const released = await releaseOrder(order.id, options.canceledByShopper ? "canceled" : "expired");
    return result(released ? "released" : "unchanged");
  }
  if (session.status !== "complete") return result("unchanged");

  if (options.paymentFailed) {
    const released = await releaseOrder(order.id, "failed");
    return result(released ? "released" : "unchanged");
  }

  const paymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  const details = {
    stripePaymentIntentId: paymentIntentId,
    email: session.customer_details?.email ?? null,
    shipping: toShipping(session),
    updatedAt: new Date(),
  };

  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    // Stripe must have charged exactly what we computed from our database.
    if (session.amount_total !== order.totalCents || session.currency !== order.currency) {
      console.error(
        `[orders] Amount mismatch on order ${order.publicId}: Stripe ${session.amount_total} ${session.currency}, ` +
          `order ${order.totalCents} ${order.currency}. Left unpaid for review.`,
      );
      return result("amount_mismatch");
    }
    const updated = await db
      .update(orders)
      .set({ ...details, status: "paid", paymentStatus: "paid", paidAt: new Date() })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    if (updated.length > 0) return result("paid");
    if (order.status === "canceled") {
      // The hold was released, yet Stripe took payment. Needs a person: refund or restock and fulfil.
      console.error(`[orders] Payment received for canceled order ${order.publicId} (session ${session.id}).`);
    }
    return result("unchanged");
  }

  // Complete but unpaid: a delayed payment method (e.g. a bank debit) is settling. Keep the hold.
  const updated = await db
    .update(orders)
    .set({ ...details, paymentStatus: "processing" })
    .where(and(eq(orders.id, order.id), eq(orders.status, "pending"), eq(orders.paymentStatus, "unpaid")))
    .returning({ id: orders.id });
  return result(updated.length > 0 ? "processing" : "unchanged");
}

/**
 * Ends this shopper's earlier unpaid checkouts before starting a new one, so
 * one person never holds stock twice. Delayed payments in progress are kept.
 */
export async function releaseUserPendingOrders(userId: string): Promise<void> {
  const open = await db.query.orders.findMany({
    where: and(eq(orders.userId, userId), eq(orders.status, "pending"), eq(orders.paymentStatus, "unpaid")),
    columns: { id: true, stripeCheckoutSessionId: true },
  });
  for (const order of open) {
    if (!order.stripeCheckoutSessionId) {
      await releaseOrder(order.id, "canceled");
      continue;
    }
    await expireAndSync(order.stripeCheckoutSessionId, { canceledByShopper: true });
  }
}

/**
 * Expires an open Checkout Session and applies the result. If the session has
 * already completed or expired, applies its current state instead (it may have
 * been paid moments ago).
 */
export async function expireAndSync(
  sessionId: string,
  options: { canceledByShopper?: boolean } = {},
): Promise<{ orderId: number; outcome: SyncOutcome } | null> {
  const stripe = getStripe();
  let session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.status === "open") {
    try {
      session = await stripe.checkout.sessions.expire(sessionId);
    } catch {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    }
  }
  return syncOrderFromSession(session, options);
}

/**
 * Backstop for missed webhooks: settles unpaid orders whose hold lapsed more
 * than five minutes ago by asking Stripe for the session's real state.
 */
export async function reconcileStaleOrders(limit = 10): Promise<void> {
  const stale = await db.execute<{ id: number; session_id: string | null }>(sql`
    SELECT id, stripe_checkout_session_id AS session_id FROM orders
    WHERE status = 'pending' AND payment_status = 'unpaid'
      AND (
        (stripe_checkout_session_id IS NOT NULL AND reserved_until < now() - interval '5 minutes')
        OR (stripe_checkout_session_id IS NULL AND created_at < now() - interval '10 minutes')
      )
    ORDER BY created_at
    LIMIT ${limit}
  `);
  for (const row of stale.rows) {
    if (!row.session_id) {
      await releaseOrder(row.id, "canceled");
      continue;
    }
    const session = await getStripe().checkout.sessions.retrieve(row.session_id);
    await syncOrderFromSession(session);
  }
}

export async function findOrderBySession(sessionId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.stripeCheckoutSessionId, sessionId),
    columns: { id: true, publicId: true, userId: true, status: true, paymentStatus: true },
  });
}

export async function findOrderForUser(publicId: string, userId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.publicId, publicId), eq(orders.userId, userId)),
    columns: { id: true, publicId: true, status: true, paymentStatus: true, stripeCheckoutSessionId: true },
  });
}

/** An order with its items, only if it belongs to this user. */
/**
 * The signed-in customer's order history, newest first. Always scoped to the
 * given user id (pass the id from requireUser, never from the request).
 * Checkouts the shopper abandoned (canceled or expired before any payment) are
 * left out: they were never charged and would only repeat the bag.
 */
export async function listOrdersForUser(userId: string, limit = 50): Promise<OrderSummary[]> {
  const rows = await db.query.orders.findMany({
    where: and(eq(orders.userId, userId), notInArray(orders.paymentStatus, ["canceled", "expired"])),
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    limit,
    columns: { publicId: true, status: true, paymentStatus: true, totalCents: true, createdAt: true },
    with: { items: { columns: { productName: true, quantity: true }, orderBy: (i, { asc }) => [asc(i.id)] } },
  });
  return rows.map(({ items, ...order }) => ({
    ...order,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    lineCount: items.length,
    firstItemName: items[0]?.productName ?? null,
  }));
}

export async function getOrderView(publicId: string, userId: string): Promise<OrderView | undefined> {
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.publicId, publicId), eq(orders.userId, userId)),
    with: { items: { orderBy: (i, { asc }) => [asc(i.id)] } },
  });
  if (!order) return undefined;
  return {
    publicId: order.publicId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    email: order.email,
    shipping: order.shipping,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    items: order.items.map((i) => ({
      slug: i.productSlug,
      name: i.productName,
      size: i.size,
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
    })),
  };
}

/** Records a processed webhook event; false if it was already recorded. */
export async function recordStripeEvent(id: string, type: string, orderId: number | null): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO stripe_events (id, type, order_id) VALUES (${id}, ${type}, ${orderId})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `);
  return result.rows.length > 0;
}

export async function isStripeEventProcessed(id: string): Promise<boolean> {
  const result = await db.execute(sql`SELECT 1 FROM stripe_events WHERE id = ${id}`);
  return result.rows.length > 0;
}

function toShipping(session: Stripe.Checkout.Session): OrderShipping | null {
  const details = session.collected_information?.shipping_details;
  if (!details) return null;
  const a = details.address;
  return {
    name: details.name ?? null,
    address: {
      line1: a.line1 ?? null,
      line2: a.line2 ?? null,
      city: a.city ?? null,
      state: a.state ?? null,
      postalCode: a.postal_code ?? null,
      country: a.country ?? null,
    },
  };
}

function isConstraint(error: unknown, name: string): boolean {
  for (let e: unknown = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { constraint?: string }).constraint === name) return true;
  }
  return false;
}
