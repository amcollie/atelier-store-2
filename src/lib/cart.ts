import "server-only";

import { inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import { products } from "@/db/schema";
import type { Cart, CartIssue, CartLine, CartRef } from "@/lib/cart-types";
import { LOW_STOCK_THRESHOLD } from "@/lib/catalog";
import type { ProductSize } from "@/lib/catalog-types";

// The cart is an httpOnly cookie of { slug, size, qty } references. Prices,
// names and stock are never stored there: every read resolves the lines
// against live (uncached) product and stock rows, so a tampered cookie can at
// most request quantities that get clamped. This module is the only place that
// touches the cookie. It reads the request, so call it inside <Suspense> or a
// server action, never in 'use cache'.

const COOKIE = "atelier_cart";
const MAX_AGE = 60 * 60 * 24 * 30;
export const MAX_LINES = 20;
/** Per-line ceiling regardless of stock, to keep the cookie and inputs sane. */
export const MAX_LINE_QTY = 99;

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const lineKey = (slug: string, size: string | null) => `${slug}::${size ?? ""}`;

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 120 && SLUG_RE.test(value);
}

export function isValidSize(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0 && value.length <= 40);
}

/** Defensive parse: anything malformed is dropped; duplicate lines are merged. */
export function parseCart(raw: string | undefined): CartRef[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const merged = new Map<string, CartRef>();
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const { s, z, q } = item as Record<string, unknown>;
    if (!isValidSlug(s) || !isValidSize(z ?? null) || !Number.isInteger(q) || (q as number) < 1) continue;
    const size = (z ?? null) as string | null;
    const key = lineKey(s, size);
    const qty = Math.min(MAX_LINE_QTY, (merged.get(key)?.qty ?? 0) + (q as number));
    merged.set(key, { slug: s, size, qty });
    if (merged.size >= MAX_LINES) break;
  }
  return [...merged.values()];
}

export async function readCartRefs(): Promise<CartRef[]> {
  return parseCart((await cookies()).get(COOKIE)?.value);
}

/** Server actions only: Server Components can't set cookies. */
export async function writeCartRefs(refs: CartRef[]): Promise<void> {
  const store = await cookies();
  const lines = refs.filter((r) => r.qty > 0).slice(0, MAX_LINES);
  if (lines.length === 0) {
    store.delete(COOKIE);
    return;
  }
  store.set(COOKIE, JSON.stringify(lines.map((r) => ({ s: r.slug, z: r.size, q: r.qty }))), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export type LiveProduct = {
  slug: string;
  name: string;
  priceCents: number;
  image: { src: string; alt: string };
  sizes: ProductSize[] | null;
  stock: number;
};

/** Current price and stock straight from Postgres, deliberately uncached. */
export async function loadLiveProducts(slugs: string[]): Promise<Map<string, LiveProduct>> {
  const unique = [...new Set(slugs)];
  if (unique.length === 0) return new Map();
  const rows = await db.query.products.findMany({
    where: inArray(products.slug, unique),
    columns: { slug: true, name: true, priceCents: true, imageUrl: true, imageAlt: true, sizes: true },
    with: { stock: { columns: { quantity: true } } },
  });
  return new Map(
    rows.map((r) => [
      r.slug,
      {
        slug: r.slug,
        name: r.name,
        priceCents: r.priceCents,
        image: { src: r.imageUrl, alt: r.imageAlt },
        sizes: r.sizes,
        stock: Math.max(0, r.stock?.quantity ?? 0),
      },
    ]),
  );
}

/**
 * The size a line should carry for this product, or an error.
 * One-size and size-less products ignore whatever the client sent.
 */
export function resolveSize(
  product: LiveProduct,
  size: string | null,
): { ok: true; size: string | null } | { ok: false; reason: "missing" | "unavailable" } {
  const sizes = product.sizes ?? [];
  if (sizes.length === 0) return { ok: true, size: null };
  if (sizes.length === 1) {
    return sizes[0].available ? { ok: true, size: sizes[0].label } : { ok: false, reason: "unavailable" };
  }
  if (size === null) return { ok: false, reason: "missing" };
  const match = sizes.find((s) => s.label === size);
  return match?.available ? { ok: true, size: match.label } : { ok: false, reason: "unavailable" };
}

/**
 * Clamp every line to live stock. Stock is per product, so all sizes of one
 * product share it, filled in cart order. Lines whose product no longer exists
 * are dropped.
 */
export function resolveCart(refs: CartRef[], live: Map<string, LiveProduct>): Cart {
  const used = new Map<string, number>();
  const draft: { ref: CartRef; product: LiveProduct; qty: number; issue?: CartLine["issue"] }[] = [];

  for (const ref of refs) {
    const product = live.get(ref.slug);
    if (!product) continue;
    const sized = resolveSize(product, ref.size);
    if (!sized.ok || sized.size !== ref.size) {
      draft.push({ ref, product, qty: 0, issue: "size_unavailable" });
      continue;
    }
    const remaining = product.stock - (used.get(ref.slug) ?? 0);
    const qty = Math.max(0, Math.min(ref.qty, remaining, MAX_LINE_QTY));
    used.set(ref.slug, (used.get(ref.slug) ?? 0) + qty);
    const issue: CartIssue | undefined =
      product.stock === 0 ? "sold_out" : qty === 0 ? "held_elsewhere" : qty < ref.qty ? "reduced" : undefined;
    draft.push({ ref, product, qty, issue });
  }

  const lines: CartLine[] = draft.map(({ ref, product, qty, issue }) => {
    const free = product.stock - (used.get(ref.slug) ?? 0);
    const maxQty = qty === 0 ? 0 : Math.min(MAX_LINE_QTY, qty + Math.max(0, free));
    return {
      key: lineKey(ref.slug, ref.size),
      slug: ref.slug,
      size: ref.size,
      sizeLabel: ref.size && (product.sizes?.length ?? 0) > 1 ? ref.size : undefined,
      name: product.name,
      href: `/products/${ref.slug}`,
      image: product.image,
      priceCents: product.priceCents,
      qty,
      maxQty,
      lineTotalCents: product.priceCents * qty,
      lowStock: product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD ? product.stock : undefined,
      issue,
    };
  });

  return {
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotalCents: lines.reduce((sum, l) => sum + l.lineTotalCents, 0),
  };
}

/** The current cart, resolved against live prices and stock. Cached per request (header and page share it). */
export const getCart = cache(async (): Promise<Cart> => {
  const refs = await readCartRefs();
  return resolveCart(refs, await loadLiveProducts(refs.map((r) => r.slug)));
});
