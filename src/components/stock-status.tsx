import type { Product } from "@/lib/catalog-types";

const states = {
  in_stock: { label: "In stock", note: "Ships in 1–2 business days", dot: "bg-success", text: "text-ink" },
  low_stock: { label: "Low stock", note: "", dot: "bg-warning", text: "text-warning" },
  out_of_stock: { label: "Sold out", note: "Currently unavailable", dot: "bg-muted", text: "text-muted" },
} as const;

export function StockStatus({ stock }: { stock: Product["stock"] }) {
  const s = states[stock.status];
  const label =
    stock.status === "low_stock" && stock.quantity ? `Only ${stock.quantity} left` : s.label;

  return (
    <p className={`flex items-center gap-2 text-meta ${s.text}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="font-medium">{label}</span>
      {s.note ? <span className="text-muted">· {s.note}</span> : null}
    </p>
  );
}
