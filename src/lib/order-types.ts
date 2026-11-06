// Order shapes shared by the orders module and order pages.

import type { OrderShipping } from "@/db/order-schema";

export type OrderStatus = "pending" | "paid" | "canceled";
export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "expired" | "canceled";
export type OrderReviewReason = "paid_after_cancel" | "amount_mismatch";

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
  /** Stripe took a payment that couldn't settle the order automatically; a person is checking it. */
  underReview: boolean;
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
  underReview: boolean;
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
  unpaid: { label: "Awaiting payment", tone: "wait" },
  failed: { label: "Payment failed", tone: "stop" },
  expired: { label: "Checkout expired", tone: "stop" },
  canceled: { label: "Checkout canceled", tone: "stop" },
};

/** Shown instead of the payment status while an order is flagged for review. */
export const UNDER_REVIEW_DISPLAY = { label: "Under review", tone: "wait" } as const;

/** What each review reason means, for the admin orders list. */
export const REVIEW_REASON_LABEL: Record<OrderReviewReason, string> = {
  paid_after_cancel: "Paid after the checkout was canceled: refund, or restock and fulfil",
  amount_mismatch: "Stripe's amount or currency differs from the order",
};
