import "server-only";

import { desc, isNotNull } from "drizzle-orm";

import { db } from "@/db";
import { orders } from "@/db/schema";
import type { OrderReviewReason, OrderStatus, PaymentStatus } from "@/lib/order-types";
import { assertAdmin } from "@/lib/session";

// Admin read of orders. Read-only: there are no refunds or edits here. Every
// function checks the role itself (assertAdmin) on top of the page check.

export const ADMIN_ORDERS_LIMIT = 100;

export type AdminOrderRow = {
  publicId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  createdAt: Date;
  /** The email Stripe collected, else the account's. */
  email: string;
  reviewReason: OrderReviewReason | null;
  reviewFlaggedAt: Date | null;
  stripePaymentIntentId: string | null;
  itemCount: number;
};

/** Newest first, up to ADMIN_ORDERS_LIMIT. `review` keeps only orders flagged for review. */
export async function listOrders(filter: { review?: boolean } = {}): Promise<AdminOrderRow[]> {
  await assertAdmin();
  const rows = await db.query.orders.findMany({
    where: filter.review ? isNotNull(orders.reviewReason) : undefined,
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    limit: ADMIN_ORDERS_LIMIT,
    columns: {
      publicId: true,
      status: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      email: true,
      reviewReason: true,
      reviewFlaggedAt: true,
      stripePaymentIntentId: true,
    },
    with: { items: { columns: { quantity: true } }, user: { columns: { email: true } } },
  });
  return rows.map(({ items, user: owner, email, ...o }) => ({
    ...o,
    email: email ?? owner.email,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
  }));
}

/** How many orders need a person, for the overview and the filter label. */
export async function countOrdersForReview(): Promise<number> {
  await assertAdmin();
  return db.$count(orders, isNotNull(orders.reviewReason));
}
