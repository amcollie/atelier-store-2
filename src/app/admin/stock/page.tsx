import Image from "next/image";
import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { StockForm } from "@/components/admin/stock-form";
import { listCategoryOptions, listStock, type StockRow } from "@/lib/admin/catalog";
import { stockTone } from "@/lib/admin/stock-tone";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

export default function AdminStockPage({ searchParams }: PageProps<"/admin/stock">) {
  return (
    <AdminPage path="/admin/stock" title="Stock">
      <StockList searchParams={searchParams} />
    </AdminPage>
  );
}

async function StockList({ searchParams }: { searchParams: PageProps<"/admin/stock">["searchParams"] }) {
  const params = await searchParams;
  const raw = typeof params.category === "string" ? Number(params.category) : NaN;
  const categoryId = Number.isInteger(raw) && raw > 0 ? raw : undefined;
  const attention = params.attention === "1";
  const [rows, categories] = await Promise.all([listStock({ categoryId, attention }), listCategoryOptions()]);

  return (
    <div className="stack gap-6">
      <p className="max-w-2xl text-meta text-muted">
        <strong className="font-medium text-ink">Available</strong> is what shoppers can buy now and is the number you
        set. Units in open checkouts are <strong className="font-medium text-ink">held</strong>: they&rsquo;re already
        taken out of available and return to it if the checkout doesn&rsquo;t complete.{" "}
        <strong className="font-medium text-ink">On hand</strong> is available plus held. After a shelf count, set
        available to the count minus held.
      </p>

      {/* A plain GET form, so filtering works without JavaScript. */}
      <form method="get" className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="stack gap-1">
          <label htmlFor="stock-category" className="eyebrow">
            Sub-category
          </label>
          <select id="stock-category" name="category" defaultValue={categoryId ?? ""} className="field min-w-56">
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
        <label className="flex min-h-11 items-center gap-2 text-meta">
          <input type="checkbox" name="attention" value="1" defaultChecked={attention} />
          Low or sold out only
        </label>
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      <p className="text-meta text-muted" role="status">
        {rows.length} {rows.length === 1 ? "product" : "products"}
        {attention ? " low or sold out" : ""}
        {categoryId ? " in this sub-category" : ""}
      </p>

      {rows.length === 0 ? (
        <p className="border-y border-line py-10 text-muted">
          {attention ? "Nothing is low or sold out here." : "No products here yet."}
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <StockListRow key={row.id} row={row} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StockListRow({ row }: { row: StockRow }) {
  const tone = stockTone(row.quantity);
  return (
    <li className="grid grid-cols-[3rem_1fr] gap-x-4 gap-y-4 py-5 md:grid-cols-[3rem_1fr_auto] md:items-start md:gap-x-6">
      <div className="media-frame relative aspect-[4/5]">
        <Image src={row.imageUrl} alt="" fill sizes="3rem" />
      </div>
      <div className="stack min-w-0 gap-1 text-meta">
        <p className="font-medium">
          <Link href={`/admin/products/${row.id}/edit`} className="link">
            {row.name}
          </Link>
        </p>
        <p className="text-muted">
          {row.category.parentName} / {row.category.name}
        </p>
        <p className={`flex items-center gap-2 ${tone.text}`}>
          <span className={`size-1.5 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
          {tone.label}
        </p>
        <p className="tabular-nums text-muted">
          Held {row.held} · On hand {row.onHand}
        </p>
      </div>
      <div className="col-span-2 md:col-span-1 md:w-64">
        <StockForm productId={row.id} quantity={row.quantity} held={row.held} variant="compact" productName={row.name} />
      </div>
    </li>
  );
}
