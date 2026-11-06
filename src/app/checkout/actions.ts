"use server";

import { redirect } from "next/navigation";

import { readCartRefs, writeCartRefs } from "@/lib/cart";
import {
  attachCheckoutSession,
  createPendingOrder,
  reconcileStaleOrders,
  releaseOrder,
  releaseUserPendingOrders,
} from "@/lib/orders";
import { requireUser } from "@/lib/session";
import { appUrl, CHECKOUT_INTEGRATION_ID, getStripe } from "@/lib/stripe";

export type CheckoutState = { error?: string };

// Starts Stripe Checkout for the signed-in shopper's bag. The browser sends
// nothing but the click: the cart comes from its cookie, and every price,
// quantity and total is recomputed from Postgres before an order is created.

const HOLD_SECONDS = 31 * 60; // Stripe's minimum session life is 30 minutes.

export async function startCheckout(): Promise<CheckoutState> {
  const user = await requireUser("/bag");

  // Where to go next: Stripe on success, or back to the bag with a notice when
  // the bag no longer matches stock. redirect() throws, so it runs after the try.
  let destination: string;
  try {
    // Settle lapsed holds whose expiry webhook never arrived, then this shopper's earlier unpaid checkouts.
    await reconcileStaleOrders().catch((error) => console.error("[checkout] Reconcile failed:", error));
    await releaseUserPendingOrders(user.id);

    const created = await createPendingOrder(user.id, await readCartRefs());
    if (!created.ok) {
      // Save the corrected quantities so the re-rendered bag shows exactly what checkout will charge.
      if (created.reason === "changed") await writeCartRefs(created.refs);
      if (created.reason === "in_progress") {
        return { error: "Checkout is already opening in another window. Continue there, or try again in a moment." };
      }
      destination =
        created.reason === "empty"
          ? "/bag"
          : created.reason === "changed"
            ? "/bag?checkout=changed"
            : "/bag?checkout=unavailable";
    } else {
      const url = await openSession(created.order, user.email);
      if (!url) return { error: "We couldn’t start checkout. Please try again in a moment." };
      destination = url;
    }
  } catch (error) {
    console.error("[checkout] startCheckout failed:", error);
    return { error: "We couldn’t start checkout. Please try again in a moment." };
  }

  redirect(destination);
}

type PendingOrder = Extract<Awaited<ReturnType<typeof createPendingOrder>>, { ok: true }>["order"];

/** Creates the Stripe session from the order's database prices; releases the hold and returns null if that fails. */
async function openSession(order: PendingOrder, email: string): Promise<string | null> {
  let session;
  try {
    session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: order.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "usd",
            unit_amount: line.unitPriceCents,
            product_data: {
              name: line.sizeLabel ? `${line.name} (Size ${line.sizeLabel})` : line.name,
              images: [line.image],
              metadata: { product_id: String(line.productId), slug: line.slug },
            },
          },
        })),
        customer_email: email,
        client_reference_id: order.publicId,
        metadata: { order_public_id: order.publicId },
        payment_intent_data: { metadata: { order_public_id: order.publicId } },
        shipping_address_collection: { allowed_countries: ["US"] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "usd" },
              display_name: "Complimentary standard shipping",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 2 },
                maximum: { unit: "business_day", value: 4 },
              },
            },
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + HOLD_SECONDS,
        success_url: `${appUrl("/checkout/complete")}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: appUrl(`/checkout/cancel?order=${order.publicId}`),
        integration_identifier: CHECKOUT_INTEGRATION_ID,
      },
      { idempotencyKey: `checkout-session-${order.publicId}` },
    );
  } catch (error) {
    console.error("[checkout] Creating the Stripe session failed:", error);
    await releaseOrder(order.id, "canceled");
    return null;
  }
  if (!session.url) {
    await releaseOrder(order.id, "canceled");
    return null;
  }

  if (!(await attachCheckoutSession(order.id, session))) {
    // The order was released while the session was being created, so its stock
    // is back on sale. Never send the shopper to pay for it.
    console.error(`[checkout] Order ${order.publicId} was released before its session was saved; expiring ${session.id}.`);
    await getStripe()
      .checkout.sessions.expire(session.id)
      .catch((error) => console.error("[checkout] Expiring the orphaned session failed:", error));
    return null;
  }
  return session.url;
}
