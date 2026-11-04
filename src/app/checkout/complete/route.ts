import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { clearCart } from "@/lib/cart";
import { findOrderBySession, syncOrderFromSession } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

// Stripe's success_url. Reaching this URL proves nothing: the session_id in it
// only tells us which session to look up. The order's state comes from the
// session as retrieved from the Stripe API on our server (the same idempotent
// sync the webhook runs, which covers webhook delay), never from the URL.

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) redirect("/bag");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?callbackURL=${encodeURIComponent(`/checkout/complete?session_id=${sessionId}`)}`);
  }

  const order = await findOrderBySession(sessionId);
  if (!order || order.userId !== user.id) return new Response("Not found", { status: 404 });

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    await syncOrderFromSession(session);
    // The shopper finished Stripe's form, so this bag became the order.
    if (session.status === "complete") await clearCart();
  } catch (error) {
    // The webhook will still settle the order; the order page shows it as awaiting confirmation meanwhile.
    console.error(`[checkout] Could not confirm session ${sessionId} on return:`, error);
  }

  redirect(`/checkout/orders/${order.publicId}`);
}
