import Stripe from "stripe";

import { isStripeEventProcessed, recordStripeEvent, syncOrderFromSession } from "@/lib/orders";

// Stripe webhook endpoint. The only place (with the return routes, which
// retrieve the session from Stripe themselves) where an order can become paid.
// Configure it for: checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed and checkout.session.expired.

const HANDLED = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set; rejecting webhook.");
    return new Response("Webhook not configured", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // The signature covers the exact bytes Stripe sent, so read the raw body.
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    // Verification needs only the signing secret, not an API key.
    event = Stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (!HANDLED.has(event.type)) return Response.json({ received: true, ignored: true });
  if (await isStripeEventProcessed(event.id)) return Response.json({ received: true, duplicate: true });

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    const result = await syncOrderFromSession(session, {
      paymentFailed: event.type === "checkout.session.async_payment_failed",
    });
    await recordStripeEvent(event.id, event.type, result?.orderId ?? null);
    return Response.json({ received: true, outcome: result?.outcome ?? "not_ours" });
  } catch (error) {
    // 500 makes Stripe retry; syncOrderFromSession is idempotent, so a retry is safe.
    console.error(`[stripe] Failed to process ${event.type} ${event.id}:`, error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
