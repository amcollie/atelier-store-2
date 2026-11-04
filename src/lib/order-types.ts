// Order shapes shared by the orders module and order pages.

import type { OrderShipping } from "@/db/order-schema";

export type OrderStatus = "pending" | "paid" | "canceled";
export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "expired" | "canceled";

export type OrderView = {
  publicId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  email: string | null;
  shipping: OrderShipping | null;
  createdAt: Date;
  paidAt: Date | null;
  items: {
    slug: string;
    name: string;
    size: string | null;
    unitPriceCents: number;
    quantity: number;
    lineTotalCents: number;
    /** The product's current photo (not part of the snapshot). */
    image: string;
  }[];
};

/** One row of a customer's order history. */
export type OrderSummary = {
  publicId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalCents: number;
  createdAt: Date;
  /** Pieces across all lines. */
  itemCount: number;
  /** Distinct lines (product and size). */
  lineCount: number;
  firstItemName: string | null;
};

/** How each payment status reads to the customer, and the dot colour that goes with it. */
export const PAYMENT_STATUS_DISPLAY: Record<PaymentStatus, { label: string; tone: "ok" | "wait" | "stop" }> = {
  paid: { label: "Paid", tone: "ok" },
  processing: { label: "Payment processing", tone: "wait" },
  unpaid: { label: "Awaiting confirmation", tone: "wait" },
  failed: { label: "Payment failed", tone: "stop" },
  expired: { label: "Checkout expired", tone: "stop" },
  canceled: { label: "Checkout canceled", tone: "stop" },
};
