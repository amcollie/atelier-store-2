import Image from "next/image";
import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { type AdminProductRow, listCategoryOptions, listProducts } from "@/lib/admin/catalog";
import { stockTone } from "@/lib/admin/stock-tone";
import { formatPrice } from "@/lib/sample-data";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <AdminPage path="/admin/products" title="Products">
      <ProductList searchParams={searchParams} />
    </AdminPage>
  );
}

async function ProductList({ searchParams }: { searchParams: PageProps<"/admin/products">["searchParams"] }) {
  const params = await searchParams;
  const raw = typeof params.category === "string" ? Number(params.category) : NaN;
  const categoryId = Number.isInteger(raw) && raw > 0 ? raw : undefined;
  const [products, categories] = await Promise.all([listProducts({ categoryId }), listCategoryOptions()]);

  return (
    <div className="stack gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* A plain GET form, so filtering works without JavaScript. */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="stack gap-1">
            <label htmlFor="category-filter" className="eyebrow">
              Sub-category
            </label>
            <select id="category-filter" name="category" defaultValue={categoryId ?? ""} className="field min-w-56">
              <option value="">All products</option>
              {categories.map((top) => (
                <optgroup key={top.id} label={top.name}>
                  {top.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {top.name} / {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
        </form>
        <Link href="/admin/products/new" className="btn btn-primary">
          New product
        </Link>
      </div>

      <p className="text-meta text-muted" role="status">
        {products.length} {products.length === 1 ? "product" : "products"}
        {categoryId ? " in this sub-category" : ""}
      </p>

      {products.length === 0 ? (
        <p className="border-y border-line py-10 text-muted">No products here yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProductRow({ product: p }: { product: AdminProductRow }) {
  const stock = stockTone(p.quantity);
  return (
    <li className="grid grid-cols-[4rem_1fr] gap-4 py-5 md:grid-cols-[4rem_1fr_auto] md:items-center md:gap-6">
      <div className="media-frame relative aspect-[4/5]">
        <Image src={p.imageUrl} alt="" fill sizes="4rem" />
      </div>
      <div className="stack min-w-0 gap-1 text-meta">
        <p className="font-medium">
          {p.name}
          {p.badge ? <span className="eyebrow ml-2 text-muted">{p.badge}</span> : null}
        </p>
        <p className="text-muted">
          {p.category.parentName} / {p.category.name} · <span className="tabular-nums">{formatPrice(p.priceCents)}</span>
        </p>
        <p className={`flex items-center gap-2 ${stock.text}`}>
          <span className={`size-1.5 shrink-0 rounded-full ${stock.dot}`} aria-hidden="true" />
          {stock.label}
          {p.unavailableSizes > 0 ? (
            <span className="text-muted">
              · {p.unavailableSizes} of {p.sizeCount} sizes unavailable
            </span>
          ) : null}
        </p>
      </div>
      <div className="col-span-2 cluster gap-x-6 gap-y-2 md:col-span-1">
        <Link href={`/admin/products/${p.id}/edit`} className="btn btn-text" aria-label={`Edit ${p.name}`}>
          Edit
        </Link>
        <Link href={`/products/${p.slug}`} className="btn btn-text text-muted" aria-label={`View ${p.name} in the store`}>
          View
        </Link>
      </div>
    </li>
  );
}
