// Cart shapes shared by the server cart module and (client) components.

import type { ImageAsset } from "@/lib/catalog-types";

/** What the cookie stores: references only, never prices or stock. */
export type CartRef = { slug: string; size: string | null; qty: number };

export type CartLine = {
  /** Stable key for a line: slug plus size. */
  key: string;
  slug: string;
  size: string | null;
  /** Size to show the shopper; omitted for one-size and size-less products. */
  sizeLabel?: string;
  name: string;
  href: string;
  image: ImageAsset;
  /** Current price from the database, in cents. */
  priceCents: number;
  /** Quantity after clamping to live stock; 0 means the line can't be bought. */
  qty: number;
  /** Most this line can hold given stock and the product's other lines. */
  maxQty: number;
  lineTotalCents: number;
  /** Units in stock when that's low (same threshold as the product page); otherwise undefined. */
  lowStock?: number;
  /**
   * Why the line differs from what the shopper added:
   * - reduced: quantity lowered to fit live stock
   * - sold_out: the product has no stock
   * - size_unavailable: the size was withdrawn or no longer exists
   * - held_elsewhere: other sizes of this product in the bag already hold all the stock
   */
  issue?: CartIssue;
};

export type CartIssue = "reduced" | "sold_out" | "size_unavailable" | "held_elsewhere";

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
