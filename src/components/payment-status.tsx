import { PAYMENT_STATUS_DISPLAY, type PaymentStatus, UNDER_REVIEW_DISPLAY } from "@/lib/order-types";

const dot = { ok: "bg-success", wait: "bg-warning", stop: "bg-muted" } as const;
const text = { ok: "text-ink", wait: "text-warning", stop: "text-muted" } as const;

/** An order's payment status as a coloured dot and label, used by order history, the order page and admin. */
export function PaymentStatusLabel({ status, underReview = false }: { status: PaymentStatus; underReview?: boolean }) {
  const s = underReview ? UNDER_REVIEW_DISPLAY : PAYMENT_STATUS_DISPLAY[status];
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${text[s.tone]}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${dot[s.tone]}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
