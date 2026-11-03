import type { Metadata } from "next";
import Link from "next/link";

import { ProductGrid } from "@/components/product-grid";
import { getNewArrivals } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The latest pieces from the atelier, newest first.",
};

export default async function ArrivalsPage() {
  const arrivals = await getNewArrivals(24);
  const count = arrivals.length;

  return (
    <main id="main" className="flex-1">
      <header className="container-page stack gap-4 pt-8 pb-8 md:pt-10 md:pb-10 lg:pt-12">
        <nav aria-label="Breadcrumb">
          <ol className="cluster gap-2 text-meta text-muted">
            <li>
              <Link href="/" className="link-quiet">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page">New arrivals</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="stack gap-2">
            <p className="eyebrow text-muted">Just in</p>
            <h1 className="heading-display">New arrivals</h1>
          </div>
          <p className="text-meta text-muted tabular-nums">
            {count} {count === 1 ? "piece" : "pieces"}
          </p>
        </div>
        <p className="max-w-prose text-muted">The latest pieces from the atelier, newest first.</p>
      </header>

      {count > 0 ? (
        <section aria-label="New arrivals" className="pb-section">
          <ProductGrid products={arrivals} />
        </section>
      ) : (
        <section className="section container-page flex flex-col items-center gap-5 border-t border-line text-center">
          <p className="max-w-prose text-muted">Nothing new just yet. Check back soon for the latest pieces.</p>
          <Link href="/" className="btn btn-primary">
            Return home
          </Link>
        </section>
      )}
    </main>
  );
}
