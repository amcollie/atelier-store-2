"use server";

import {
  isValidSize,
  isValidSlug,
  lineKey,
  loadBagProducts,
  MAX_LINE_QTY,
  MAX_LINES,
  readCartRefs,
  resolveCart,
  resolveSize,
  writeCartRefs,
} from "@/lib/cart";
import type { Cart, CartActionState, CartRef } from "@/lib/cart-types";

// Cart mutations. The client only sends which product, size and quantity;
// price and stock always come from the database. Setting the cookie here makes
// Next re-render the route, so the bag page and header count update in the
// same round trip.

const error = (message: string): CartActionState => ({ status: "error", message, at: Date.now() });
const ok = (message: string): CartActionState => ({ status: "ok", message, at: Date.now() });

function readLineInput(formData: FormData) {
  const slug = formData.get("slug");
  const rawSize = formData.get("size");
  const size = typeof rawSize === "string" && rawSize !== "" ? rawSize : null;
  return isValidSlug(slug) && isValidSize(size) ? { slug, size } : null;
}

function readQty(formData: FormData, fallback?: number): number | null {
  const raw = formData.get("qty");
  if (raw === null && fallback !== undefined) return fallback;
  if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw.trim())) return null;
  const qty = Number(raw);
  return qty <= MAX_LINE_QTY ? qty : null;
}

/**
 * Refs to save after a mutation: available lines at their clamped quantity,
 * unavailable lines kept as they were (so the shopper sees and removes them),
 * lines for deleted products dropped.
 */
function persistable(refs: CartRef[], cart: Cart): CartRef[] {
  const lines = new Map(cart.lines.map((l) => [l.key, l]));
  return refs.flatMap((ref) => {
    const line = lines.get(lineKey(ref.slug, ref.size));
    if (!line) return [];
    return [line.qty === 0 ? ref : { ...ref, qty: line.qty }];
  });
}

export async function addToCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const input = readLineInput(formData);
  const qty = readQty(formData, 1);
  if (!input || !qty) return error("We couldn't add that item. Refresh the page and try again.");

  const refs = await readCartRefs();
  const live = await loadBagProducts([input.slug, ...refs.map((r) => r.slug)]);
  const product = live.get(input.slug);
  if (!product) return error("This item is no longer available.");

  const sized = resolveSize(product, input.size);
  if (!sized.ok) return error(sized.reason === "missing" ? "Please select a size." : "That size is unavailable.");
  if (product.stock === 0) return error("This item is sold out.");

  const cart = resolveCart(refs, live);
  const key = lineKey(product.slug, sized.size);
  const existing = cart.lines.find((l) => l.key === key && l.qty > 0);
  const inBag = cart.lines.filter((l) => l.slug === product.slug).reduce((n, l) => n + l.qty, 0);
  const available = product.stock - inBag;

  if (available <= 0) {
    return error(
      product.stock === 1
        ? "The last one is already in your bag."
        : `All ${product.stock} available are already in your bag.`,
    );
  }

  const next = persistable(refs, cart).filter((r) => lineKey(r.slug, r.size) !== key);
  if (next.length >= MAX_LINES) return error(`Your bag can hold up to ${MAX_LINES} different items.`);

  const added = Math.min(qty, available, MAX_LINE_QTY - (existing?.qty ?? 0));
  if (added <= 0) return error("You've reached the limit for this item.");

  // Keep the line's position if it was already in the bag.
  const position = refs.findIndex((r) => lineKey(r.slug, r.size) === key);
  const line = { slug: product.slug, size: sized.size, qty: (existing?.qty ?? 0) + added };
  if (position === -1) next.push(line);
  else next.splice(Math.min(position, next.length), 0, line);
  await writeCartRefs(next);

  const sizeNote = sized.size && (product.sizes?.length ?? 0) > 1 ? ` · Size ${sized.size}` : "";
  if (added < qty) {
    return ok(`Only ${available}${inBag > 0 ? " more" : ""} available, so we added ${added}${sizeNote}.`);
  }
  return ok(`Added to your bag${sizeNote}.`);
}

export async function updateQuantity(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const input = readLineInput(formData);
  const qty = readQty(formData);
  if (!input || qty === null) return error("Enter a quantity between 1 and the number available.");
  if (qty === 0) return removeLine(input.slug, input.size);

  const refs = await readCartRefs();
  const cart = resolveCart(refs, await loadBagProducts(refs.map((r) => r.slug)));
  const key = lineKey(input.slug, input.size);
  const line = cart.lines.find((l) => l.key === key);
  if (!line) return error("This item is no longer in your bag.");
  if (line.qty === 0) return error("This item is unavailable. Remove it from your bag.");

  const nextQty = Math.min(qty, line.maxQty);
  await writeCartRefs(
    persistable(refs, cart).map((r) => (lineKey(r.slug, r.size) === key ? { ...r, qty: nextQty } : r)),
  );
  if (nextQty < qty) return ok(`Only ${line.maxQty} available. Quantity set to ${nextQty}.`);
  return ok(`Quantity updated to ${nextQty}.`);
}

export async function removeFromCart(_prev: CartActionState, formData: FormData): Promise<CartActionState> {
  const input = readLineInput(formData);
  if (!input) return error("We couldn't remove that item. Refresh the page and try again.");
  return removeLine(input.slug, input.size);
}

async function removeLine(slug: string, size: string | null): Promise<CartActionState> {
  const refs = await readCartRefs();
  const cart = resolveCart(refs, await loadBagProducts(refs.map((r) => r.slug)));
  const key = lineKey(slug, size);
  await writeCartRefs(persistable(refs, cart).filter((r) => lineKey(r.slug, r.size) !== key));
  return ok("Item removed from your bag.");
}
