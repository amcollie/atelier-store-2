"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

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

/** The subtotal the bag showed, in cents: digits only, else ignored. Compared with the database total, never charged. */
function readShownSubtotal(formData: FormData): number | undefined {
  const raw = formData.get("shownSubtotalCents");
  return typeof raw === "string" && /^\d{1,10}$/.test(raw) ? Number(raw) : undefined;
}

export async function startCheckout(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await requireUser("/bag");
  // Settle other lapsed holds whose webhooks never arrived, after the response,
  // so it never slows this click. Throttled inside.
  after(() => reconcileStaleOrders().catch((error) => console.error("[checkout] Reconcile failed:", error)));

  // Where to go next: Stripe on success, or back to the bag with a notice when
  // the bag no longer matches stock. redirect() throws, so it runs after the try.
  let destination: string;
  try {
    // End this shopper's earlier unpaid checkouts first.
    await releaseUserPendingOrders(user.id);

    const created = await createPendingOrder(user.id, await readCartRefs(), readShownSubtotal(formData));
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
            : created.reason === "price_changed"
              ? "/bag?checkout=prices"
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

  let attached: boolean;
  try {
    attached = await attachCheckoutSession(order.id, session);
  } catch (error) {
    // Couldn't save the session: don't leave it payable or the stock held.
    console.error(`[checkout] Saving session ${session.id} for order ${order.publicId} failed:`, error);
    await expireOrphan(session.id);
    await releaseOrder(order.id, "canceled").catch((e) => console.error("[checkout] Releasing the order failed:", e));
    return null;
  }
  if (!attached) {
    // The order was released while the session was being created, so its stock
    // is back on sale. Never send the shopper to pay for it.
    console.error(`[checkout] Order ${order.publicId} was released before its session was saved; expiring ${session.id}.`);
    await expireOrphan(session.id);
    return null;
  }
  return session.url;
}

async function expireOrphan(sessionId: string) {
  await getStripe()
    .checkout.sessions.expire(sessionId)
    .catch((error) => console.error(`[checkout] Expiring session ${sessionId} failed:`, error));
}
