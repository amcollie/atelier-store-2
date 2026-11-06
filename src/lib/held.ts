import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";

/**
 * Units held by pending orders, per product, in one grouped query. Those units
 * are already subtracted from product_stock.quantity. Products with nothing
 * held are absent from the map.
 *
 * - No filter (admin): every pending order, delayed payments included.
 * - `userId` (the bag): only that shopper's open checkouts (pending, unpaid,
 *   not flagged for review), which starting checkout again would release.
 */
export async function heldUnits(filter: { productIds?: number[]; userId?: string } = {}): Promise<Map<number, number>> {
  if (filter.productIds && filter.productIds.length === 0) return new Map();
  const rows = await db
    .select({ productId: orderItems.productId, held: sql<number>`sum(${orderItems.quantity})::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.status, "pending"),
        filter.productIds ? inArray(orderItems.productId, filter.productIds) : undefined,
        ...(filter.userId
          ? [eq(orders.userId, filter.userId), eq(orders.paymentStatus, "unpaid"), isNull(orders.reviewReason)]
          : []),
      ),
    )
    .groupBy(orderItems.productId);
  return new Map(rows.map((r) => [r.productId, r.held]));
}
