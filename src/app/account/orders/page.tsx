import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountBodySkeleton, AccountShell } from "@/components/account-shell";
import { type OrderSummary, PAYMENT_STATUS_DISPLAY } from "@/lib/order-types";
import { listOrdersForUser } from "@/lib/orders";
import { formatPrice } from "@/lib/sample-data";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Orders", robots: { index: false } };

const fullDate = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" });

const toneDot = { ok: "bg-success", wait: "bg-warning", stop: "bg-muted" } as const;
const toneText = { ok: "text-ink", wait: "text-warning", stop: "text-muted" } as const;

export default function AccountOrdersPage() {
  return (
    <AccountShell current="orders" title="Orders">
      <Suspense fallback={<AccountBodySkeleton />}>
        <Orders />
      </Suspense>
    </AccountShell>
  );
}

// Only the signed-in customer's orders: the user id comes from the session,
// and each order link leads to a page that checks ownership again.
async function Orders() {
  const user = await requireUser("/account/orders");
  const orders = await listOrdersForUser(user.id);

  if (orders.length === 0) {
    return (
      <div className="stack items-start gap-5 border-y border-line py-10">
        <h2 className="heading-title normal-case">No orders yet</h2>
        <p className="max-w-prose text-muted">When you place an order, it will appear here with its status and details.</p>
        <Link href="/arrivals" className="btn btn-primary">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="orders-title" className="stack gap-4">
      <h2 id="orders-title" className="sr-only">
        Your orders
      </h2>
      <ul className="divide-y divide-line border-y border-line">
        {orders.map((order) => (
          <OrderRow key={order.publicId} order={order} />
        ))}
      </ul>
      <p className="text-meta text-muted">
        Checkouts you left before paying aren&rsquo;t listed. Questions about an order?{" "}
        <Link href="/contact" className="link text-ink">
          Contact client services
        </Link>
        .
      </p>
    </section>
  );
}

function OrderRow({ order }: { order: OrderSummary }) {
  const status = PAYMENT_STATUS_DISPLAY[order.paymentStatus];
  const others = order.lineCount - 1;
  const summary = order.firstItemName
    ? others > 0
      ? `${order.firstItemName} and ${others} more`
      : order.firstItemName
    : null;

  return (
    <li className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
      <div className="stack min-w-0 gap-2">
        <h3 className="eyebrow">
          <time dateTime={order.createdAt.toISOString()}>{fullDate.format(order.createdAt)}</time>
        </h3>
        {summary ? <p className="text-meta">{summary}</p> : null}
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-meta">
          <div className="flex gap-2">
            <dt className="sr-only">Payment status</dt>
            <dd className={`flex items-center gap-2 font-medium ${toneText[status.tone]}`}>
              <span className={`size-1.5 shrink-0 rounded-full ${toneDot[status.tone]}`} aria-hidden="true" />
              {status.label}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Total</dt>
            <dd className="tabular-nums">{formatPrice(order.totalCents)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted">Items</dt>
            <dd className="tabular-nums">{order.itemCount}</dd>
          </div>
          <div className="flex min-w-0 gap-2">
            <dt className="text-muted">Order</dt>
            <dd className="break-all">{order.publicId}</dd>
          </div>
        </dl>
      </div>
      <Link
        href={`/checkout/orders/${order.publicId}`}
        className="btn btn-secondary self-start md:self-center"
        aria-label={`View order ${order.publicId} from ${fullDate.format(order.createdAt)}`}
      >
        View order
      </Link>
    </li>
  );
}
