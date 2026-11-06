import Image from "next/image";
import Link from "next/link";

import { StockStatus } from "@/components/stock-status";
import type { Product } from "@/lib/catalog-types";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock.status === "out_of_stock";
  const badge = soldOut ? "Sold out" : product.badge;

  return (
    <article className="group relative bg-paper">
      <div className="media-frame aspect-[4/5]">
        <Image
          src={product.image.src}
          alt={product.image.alt}
          fill
          sizes="(width >= 64rem) 25vw, (width >= 48rem) 33vw, 50vw"
          className={`transition-transform duration-700 ease-quiet group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
        />
        {badge ? (
          <span className="absolute top-3 left-3 bg-paper px-1.5 py-0.5 text-micro font-bold uppercase tracking-control">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-3 pt-3 pb-6 text-meta md:px-4 md:pb-8">
        <h3 className="text-meta normal-case font-normal">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <p className={`font-medium ${soldOut ? "text-muted" : ""}`}>{formatPrice(product.priceCents)}</p>
        {/* Sold out is the image badge; only the low state needs a line here. */}
        {product.stock.status === "low_stock" ? <StockStatus stock={product.stock} compact /> : null}
      </div>
    </article>
  );
}
