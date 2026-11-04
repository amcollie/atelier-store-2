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
  }[];
};
