// Cart shapes shared by the server cart module and (client) components.

import type { ImageAsset } from "@/lib/catalog-types";

/** What the cookie stores: references only, never prices or stock. */
export type CartRef = { slug: string; size: string | null; qty: number };

export type CartLine = {
  /** Stable key for a line: slug plus size. */
  key: string;
  slug: string;
  size: string | null;
  name: string;
  href: string;
  image: ImageAsset;
  /** Current price from the database, in cents. */
  priceCents: number;
  /** Quantity after clamping to live stock (0 when unavailable). */
  qty: number;
  /** Most this line can hold given stock and the product's other lines. */
  maxQty: number;
  lineTotalCents: number;
  /** Units in stock when that's low (same threshold as the product page); otherwise undefined. */
  lowStock?: number;
  /** "reduced": quantity was lowered to fit stock; "unavailable": sold out or size gone. */
  issue?: "reduced" | "unavailable";
};

export type Cart = {
  lines: CartLine[];
  /** Total units across available lines. */
  count: number;
  subtotalCents: number;
};

/** Result returned by the cart server actions to useActionState. */
export type CartActionState = {
  status?: "ok" | "error";
  message?: string;
  /** Changes on every submission so the UI can re-announce the same message. */
  at?: number;
};
