import Link from "next/link";

import { ProductGrid } from "@/components/product-grid";
import { categoryHref, type Collection } from "@/lib/catalog";

export function CollectionView({ collection }: { collection: Collection }) {
  const { category, subcategories, products } = collection;
  const top = category.parent ?? category;
  const count = products.length;

  return (
    <main id="main" className="flex-1">
      <header className="container-page stack gap-4 pt-8 pb-6 md:pt-10 lg:pt-12">
        <nav aria-label="Breadcrumb">
          <ol className="cluster gap-2 text-meta text-muted">
            <li>
              <Link href="/" className="link-quiet">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            {category.parent ? (
              <>
                <li>
                  <Link href={categoryHref(category.parent)} className="link-quiet">
                    {category.parent.name}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
              </>
            ) : null}
            <li aria-current="page">{category.name}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="stack gap-2">
            <p className="eyebrow text-muted">{category.parent ? category.parent.name : "Collection"}</p>
            <h1 className="heading-display">{category.name}</h1>
          </div>
          <p className="text-meta text-muted tabular-nums">
            {count} {count === 1 ? "piece" : "pieces"}
          </p>
        </div>
      </header>

      {subcategories.length > 0 ? (
        <nav aria-label={`${top.name} categories`} className="container-page pb-8 md:pb-10">
          <ul className="scroll-row gap-x-6">
            <li className="shrink-0">
              <Link
                href={categoryHref(top)}
                className="eyebrow link-quiet"
                aria-current={category.parent ? undefined : "page"}
              >
                All {top.name}
              </Link>
            </li>
            {subcategories.map((sub) => (
              <li key={sub.slug} className="shrink-0">
                <Link
                  href={categoryHref(sub)}
                  className="eyebrow link-quiet"
                  aria-current={sub.slug === category.slug && category.parent ? "page" : undefined}
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {count > 0 ? (
        <section aria-label={`${category.name} products`} className="pb-section">
          <ProductGrid products={products} />
        </section>
      ) : (
        <section className="section container-page flex flex-col items-center gap-5 border-t border-line text-center">
          <p className="max-w-prose text-muted">Nothing here just yet. Check back soon for new pieces.</p>
          <Link href="/arrivals" className="btn btn-primary">
            Shop new arrivals
          </Link>
        </section>
      )}
    </main>
  );
}

/** Same frame as CollectionView, shown while a collection's URL data streams in. */
export function CollectionSkeleton() {
  return (
    <main id="main" className="flex-1" aria-busy="true">
      <div className="container-page stack gap-4 pt-8 pb-6 md:pt-10 lg:pt-12">
        <div className="h-4 w-32 bg-surface" />
        <div className="stack gap-2">
          <div className="h-4 w-20 bg-surface" />
          <div className="h-10 w-48 bg-surface" />
        </div>
      </div>
      <div className="container-page pb-8 md:pb-10">
        <div className="h-4 w-64 max-w-full bg-surface" />
      </div>
      <div className="grid-products border-y border-line bg-line md:max-lg:[&>*:nth-child(4)]:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-paper">
            <div className="media-frame aspect-[4/5]" />
            <div className="h-20 md:h-24" />
          </div>
        ))}
      </div>
    </main>
  );
}
