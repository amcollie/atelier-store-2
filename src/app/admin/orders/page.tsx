import { AdminPage } from "@/components/admin/admin-page";
import { PaymentStatusLabel } from "@/components/payment-status";
import { ADMIN_ORDERS_LIMIT, type AdminOrderRow, countOrdersForReview, listOrders } from "@/lib/admin/orders";
import { formatDate, formatPrice } from "@/lib/format";
import { REVIEW_REASON_LABEL } from "@/lib/order-types";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <AdminPage path="/admin/orders" title="Orders">
      <OrderList searchParams={searchParams} />
    </AdminPage>
  );
}

async function OrderList({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  const params = await searchParams;
  const review = params.review === "1";
  const [rows, flagged] = await Promise.all([listOrders({ review }), countOrdersForReview()]);

  return (
    <div className="stack gap-6">
      <p className="max-w-2xl text-meta text-muted">
        Read-only. Orders are settled by Stripe. An order is flagged{" "}
        <strong className="font-medium text-ink">needs review</strong> when Stripe took a payment it couldn&rsquo;t
        settle on its own; resolve those in the Stripe Dashboard (refund, or restock and fulfil).
      </p>

      {flagged > 0 ? (
        <p role="status" className="border-l-2 border-warning py-1 pl-4 text-meta text-warning">
          {flagged} {flagged === 1 ? "order needs" : "orders need"} review.
        </p>
      ) : null}

      {/* A plain GET form, so filtering works without JavaScript. */}
      <form method="get" className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <label className="flex min-h-11 items-center gap-2 text-meta">
          <input type="checkbox" name="review" value="1" defaultChecked={review} />
          Needs review only
        </label>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      <p className="text-meta text-muted" role="status">
        {rows.length} {rows.length === 1 ? "order" : "orders"}
        {review ? " needing review" : ""}
        {rows.length === ADMIN_ORDERS_LIMIT ? `, the ${ADMIN_ORDERS_LIMIT} most recent` : ""}
      </p>

      {rows.length === 0 ? (
        <p className="border-y border-line py-10 text-muted">{review ? "Nothing needs review." : "No orders yet."}</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <OrderRow key={row.publicId} order={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ order: o }: { order: AdminOrderRow }) {
  return (
    <li className="grid gap-3 py-5 text-meta md:grid-cols-[1fr_auto] md:items-start md:gap-6">
      <div className="stack min-w-0 gap-1">
        <p className="font-medium">
          <time dateTime={o.createdAt.toISOString()}>{formatDate(o.createdAt)}</time>
          <span className="ml-2 break-all font-normal text-muted">{o.publicId}</span>
        </p>
        <p className="break-all text-muted">{o.email}</p>
        <p className="tabular-nums text-muted">
          {o.itemCount} {o.itemCount === 1 ? "item" : "items"} · {formatPrice(o.totalCents)}
        </p>
        {o.reviewReason ? (
          <p className="text-warning">
            Needs review: {REVIEW_REASON_LABEL[o.reviewReason]}
            {o.stripePaymentIntentId ? <span className="break-all text-muted"> · {o.stripePaymentIntentId}</span> : null}
          </p>
        ) : null}
      </div>
      <PaymentStatusLabel status={o.paymentStatus} underReview={o.reviewReason !== null} />
    </li>
  );
}
