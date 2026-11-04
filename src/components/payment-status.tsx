import { PAYMENT_STATUS_DISPLAY, type PaymentStatus } from "@/lib/order-types";

const dot = { ok: "bg-success", wait: "bg-warning", stop: "bg-muted" } as const;
const text = { ok: "text-ink", wait: "text-warning", stop: "text-muted" } as const;

/** An order's payment status as a coloured dot and label, used by order history and the order page. */
export function PaymentStatusLabel({ status }: { status: PaymentStatus }) {
  const s = PAYMENT_STATUS_DISPLAY[status];
  return (
    <span className={`inline-flex items-center gap-2 font-medium ${text[s.tone]}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${dot[s.tone]}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
