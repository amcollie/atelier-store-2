// Stock wording shared by the store (src/lib/catalog.ts, src/lib/cart.ts) and
// the admin lists, so "low" means the same number everywhere. No server-only
// import: client components may use it.

export const LOW_STOCK_THRESHOLD = 5;

export type StockTone = { label: string; dot: string; text: string };

/** Badge for an available quantity: sold out, low (at the threshold or below) or available. */
export function stockTone(quantity: number): StockTone {
  if (quantity <= 0) return { label: "Sold out", dot: "bg-muted", text: "text-muted" };
  if (quantity <= LOW_STOCK_THRESHOLD) return { label: `${quantity} available · low`, dot: "bg-warning", text: "text-warning" };
  return { label: `${quantity} available`, dot: "bg-success", text: "text-ink" };
}
