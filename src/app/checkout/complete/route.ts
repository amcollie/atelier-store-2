import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { lineKey, readCartRefs, writeCartRefs } from "@/lib/cart";
import { findOrderBySession, getOrderCartLines, syncOrderFromSession } from "@/lib/orders";
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
    // The shopper finished Stripe's form: take what they bought out of the bag,
    // keeping anything added meanwhile (another tab) or beyond the order's quantity.
    if (session.status === "complete") {
      const bought = new Map((await getOrderCartLines(order.id)).map((l) => [lineKey(l.slug, l.size), l.qty]));
      const refs = await readCartRefs();
      await writeCartRefs(refs.map((r) => ({ ...r, qty: r.qty - (bought.get(lineKey(r.slug, r.size)) ?? 0) })));
    }
  } catch (error) {
    // The webhook will still settle the order; the order page shows it as awaiting confirmation meanwhile.
    console.error(`[checkout] Could not confirm session ${sessionId} on return:`, error);
  }

  redirect(`/checkout/orders/${order.publicId}`);
}
