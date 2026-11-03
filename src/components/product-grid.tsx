import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog-types";

// Static class names (Tailwind can't see computed ones) for the filler cell that
// completes a short last row at each breakpoint's column count (2 → 3 → 4).
const BASE_FILL = ["hidden", "col-span-1"];
const MD_FILL = ["md:hidden", "md:col-span-2 md:block", "md:col-span-1 md:block"];
const LG_FILL = ["lg:hidden", "lg:col-span-3 lg:block", "lg:col-span-2 lg:block", "lg:col-span-1 lg:block"];

/** Full product listing on the hairline grid (2 → 3 → 4 columns). */
export function ProductGrid({ products }: { products: Product[] }) {
  const count = products.length;

  return (
    <div className="grid-products border-y border-line bg-line">
      {products.map((p) => (
        <ProductCard key={p.slug} product={p} />
      ))}
      {/* Paper filler for a short last row, so the hairline background doesn't show through */}
      <div
        aria-hidden="true"
        className={`bg-paper ${BASE_FILL[count % 2]} ${MD_FILL[count % 3]} ${LG_FILL[count % 4]}`}
      />
    </div>
  );
}
