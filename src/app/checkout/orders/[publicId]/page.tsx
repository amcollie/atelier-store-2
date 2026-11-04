import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { AwaitingConfirmation } from "@/components/awaiting-confirmation";
import type { OrderView } from "@/lib/order-types";
import { getOrderView } from "@/lib/orders";
import { formatPrice } from "@/lib/sample-data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

// Order status page after Stripe Checkout. Shows only what our database says;
// the order becomes paid when Stripe confirms it (webhook or server-side
// session retrieve), not because the shopper landed here.

export default function OrderPage({ params }: PageProps<"/checkout/orders/[publicId]">) {
  return (
    <main id="main" className="flex-1">
      <Suspense fallback={<OrderSkeleton />}>
        {params.then(({ publicId }) => (
          <Order publicId={publicId} />
        ))}
      </Suspense>
    </main>
  );
}

const fullDate = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" });

function headline(order: OrderView): { eyebrow: string; title: string; body: string; tone: "ok" | "wait" | "stop" } {
  if (order.status === "paid") {
    return {
      eyebrow: "Order confirmed",
      title: "Thank you",
      body: "We’ve received your payment and your order is confirmed. It ships in 2–4 business days.",
      tone: "ok",
    };
  }
  if (order.status === "pending") {
    return order.paymentStatus === "processing"
      ? {
          eyebrow: "Payment processing",
          title: "Almost there",
          body: "Your payment is being processed by your bank. This can take a few business days; we’ve set your pieces aside and will confirm your order once it clears.",
          tone: "wait",
        }
      : {
          eyebrow: "Awaiting confirmation",
          title: "Confirming your payment",
          body: "We’re waiting for our payment provider to confirm your payment. This usually takes a few seconds; your pieces are set aside meanwhile.",
          tone: "wait",
        };
  }
  switch (order.paymentStatus) {
    case "failed":
      return {
        eyebrow: "Payment failed",
        title: "Your payment didn’t go through",
        body: "You haven’t been charged. The pieces in this order have been released; your bag may still hold them.",
        tone: "stop",
      };
    case "expired":
      return {
        eyebrow: "Checkout expired",
        title: "This checkout timed out",
        body: "You haven’t been charged. We hold pieces for 30 minutes during checkout; they have been released.",
        tone: "stop",
      };
    default:
      return {
        eyebrow: "Checkout canceled",
        title: "This checkout was canceled",
        body: "You haven’t been charged.",
        tone: "stop",
      };
  }
}

async function Order({ publicId }: { publicId: string }) {
  const user = await requireUser(`/checkout/orders/${publicId}`);
  const order = await getOrderView(publicId, user.id);
  if (!order) notFound();

  const h = headline(order);
  // Pending with no word from Stripe yet (a delayed bank payment shows "processing" instead).
  const awaiting = order.status === "pending" && order.paymentStatus === "unpaid";
  const address = order.shipping?.address;

  return (
    <>
      <header className="container-page stack gap-4 pt-8 pb-8 md:pt-10 md:pb-10 lg:pt-12">
        <nav aria-label="Breadcrumb">
          <ol className="cluster gap-2 text-meta text-muted">
            <li>
              <Link href="/account" className="link-quiet">
                My account
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/account/orders" className="link-quiet">
                Orders
              </Link>
            </li>
          </ol>
        </nav>
        <p className={`eyebrow ${h.tone === "ok" ? "text-success" : h.tone === "wait" ? "text-warning" : "text-muted"}`}>
          {h.eyebrow}
        </p>
        <h1 className="heading-display">{h.title}</h1>
        {/* Always a live region, so the switch from "Confirming" to "Thank you" is announced when the page refreshes. */}
        <p role="status" className="max-w-prose text-muted">
          {h.body}
        </p>
        {awaiting ? (
          <AwaitingConfirmation>
            <Link href="/arrivals" className="btn btn-secondary">
              Continue shopping
            </Link>
          </AwaitingConfirmation>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3">
            {h.tone === "stop" ? (
              <Link href="/bag" className="btn btn-primary">
                Return to bag
              </Link>
            ) : (
              <Link href="/arrivals" className={h.tone === "ok" ? "btn btn-primary" : "btn btn-secondary"}>
                Continue shopping
              </Link>
            )}
          </div>
        )}
      </header>

      <div className="container-page pb-section">
        <div className="grid-page gap-y-10">
          <section aria-labelledby="items-title" className="col-span-4 md:col-span-8 lg:col-span-8">
            <h2 id="items-title" className="eyebrow mb-4">
              Order details
            </h2>
            <ul className="divide-y divide-line border-y border-line">
              {order.items.map((item) => (
                <li key={`${item.slug}-${item.size ?? ""}`} className="flex items-start justify-between gap-4 py-5 text-meta">
                  <div className="stack min-w-0 gap-1">
                    <Link href={`/products/${item.slug}`} className="link-quiet">
                      {item.name}
                    </Link>
                    {item.size ? (
                      <p className="text-muted">{item.size === "One size" ? item.size : `Size ${item.size}`}</p>
                    ) : null}
                    <p className="text-muted tabular-nums">
                      {item.quantity} × {formatPrice(item.unitPriceCents)}
                    </p>
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">{formatPrice(item.lineTotalCents)}</p>
                </li>
              ))}
            </ul>
          </section>

          <aside aria-labelledby="order-summary-title" className="col-span-4 md:col-span-8 lg:col-span-4">
            <div className="stack gap-6 border border-line p-6">
              <h2 id="order-summary-title" className="eyebrow">
                Summary
              </h2>
              <dl className="stack gap-3 text-meta">
                <Row label="Order number" value={<span className="break-all font-medium">{order.publicId}</span>} />
                <Row label="Placed" value={fullDate.format(order.createdAt)} />
                <Row label="Subtotal" value={formatPrice(order.subtotalCents)} />
                <Row label="Shipping" value={order.shippingCents === 0 ? "Complimentary" : formatPrice(order.shippingCents)} />
                <div className="flex justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-medium">{order.status === "paid" ? "Total paid" : "Total"}</dt>
                  <dd className="font-medium tabular-nums">{formatPrice(order.totalCents)}</dd>
                </div>
              </dl>
              {address ? (
                <div className="stack gap-1 text-meta">
                  <h3 className="eyebrow text-muted">Shipping to</h3>
                  <address className="not-italic">
                    {order.shipping?.name ? <span className="block">{order.shipping.name}</span> : null}
                    {[address.line1, address.line2].filter(Boolean).map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                    <span className="block">
                      {[address.city, address.state].filter(Boolean).join(", ")} {address.postalCode}
                    </span>
                  </address>
                  {order.email ? <p className="break-all text-muted">{order.email}</p> : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 text-right tabular-nums">{value}</dd>
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="container-page stack gap-6 pt-8 pb-section md:pt-10 lg:pt-12" aria-busy="true">
      <div className="h-4 w-32 bg-surface" />
      <div className="h-12 w-72 max-w-full bg-surface" />
      <div className="h-40 bg-surface" />
    </div>
  );
}
