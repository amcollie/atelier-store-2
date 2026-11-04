import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { expireAndSync, findOrderForUser, releaseOrder } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

// Stripe's cancel_url: the shopper left Checkout without paying. Expire the
// session so it can't be paid later, return the held stock, and send them back
// to their bag, which is unchanged.

export async function GET(request: NextRequest) {
  const publicId = request.nextUrl.searchParams.get("order") ?? "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(publicId)) redirect("/bag");

  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?callbackURL=${encodeURIComponent("/bag")}`);

  const order = await findOrderForUser(publicId, user.id);
  if (!order) return new Response("Not found", { status: 404 });

  if (order.status !== "pending" || order.paymentStatus !== "unpaid") {
    // Already settled (or a delayed payment is in progress): show the order as it stands.
    redirect(`/checkout/orders/${order.publicId}`);
  }

  try {
    if (order.stripeCheckoutSessionId) {
      await expireAndSync(order.stripeCheckoutSessionId, { canceledByShopper: true });
    } else {
      await releaseOrder(order.id, "canceled");
    }
  } catch (error) {
    // The session still expires on its own and the webhook or reconciliation returns the stock.
    console.error(`[checkout] Could not cancel order ${order.publicId}:`, error);
  }

  // If the session completed before we could expire it (e.g. paid in another tab), show the order instead.
  const after = await findOrderForUser(publicId, user.id);
  const settled = after?.status === "paid" || after?.paymentStatus === "processing";
  redirect(settled ? `/checkout/orders/${order.publicId}` : "/bag?checkout=canceled");
}
