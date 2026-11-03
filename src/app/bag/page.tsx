import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BagLines } from "@/components/bag-lines";
import { getCart } from "@/lib/cart";
import { SHIPPING_COPY } from "@/lib/catalog";
import { formatPrice } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Shopping bag", robots: { index: false } };

export default function BagPage() {
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
            <li aria-current="page">Shopping bag</li>
          </ol>
        </nav>
        <h1 id="bag-title" tabIndex={-1} className="heading-display outline-none">
          Shopping bag
        </h1>
      </header>

      <Suspense fallback={<BagSkeleton />}>
        <BagContents />
      </Suspense>
    </main>
  );
}

async function BagContents() {
  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <section className="section container-page flex flex-col items-center gap-5 border-t border-line text-center">
        <p className="max-w-prose text-muted">Your bag is empty.</p>
        <Link href="/arrivals" className="btn btn-primary">
          Shop new arrivals
        </Link>
      </section>
    );
  }

  const changed = cart.lines.some((l) => l.issue);

  return (
    <div className="container-page pb-section">
      <div className="grid-page gap-y-10">
        <section aria-labelledby="bag-items-title" className="col-span-4 md:col-span-8 lg:col-span-8">
          <h2 id="bag-items-title" className="sr-only">
            Items
          </h2>
          {changed ? (
            <p className="mb-6 border-l-2 border-warning py-1 pl-4 text-meta text-warning" role="status">
              Some items in your bag changed since you added them. We&rsquo;ve updated the quantities to what&rsquo;s
              available.
            </p>
          ) : null}
          <BagLines lines={cart.lines} />
        </section>

        <aside aria-labelledby="summary-title" className="col-span-4 md:col-span-8 lg:col-span-4">
          <div className="stack gap-6 border border-line p-6 lg:sticky lg:top-header">
            <h2 id="summary-title" className="eyebrow">
              Order summary
            </h2>
            <dl className="stack gap-3 text-meta">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">
                  Subtotal · {cart.count} {cart.count === 1 ? "item" : "items"}
                </dt>
                <dd className="font-medium tabular-nums">{formatPrice(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd>Complimentary</dd>
              </div>
            </dl>
            <p className="text-meta text-muted">{SHIPPING_COPY}</p>
            <button type="button" className="btn btn-primary btn-block" disabled>
              Checkout coming soon
            </button>
            <Link href="/arrivals" className="link self-center text-meta">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function BagSkeleton() {
  return (
    <div className="container-page pb-section" aria-busy="true">
      <div className="grid-page gap-y-10">
        <div className="col-span-4 stack gap-6 md:col-span-8 lg:col-span-8">
          <div className="h-36 bg-surface" />
          <div className="h-36 bg-surface" />
        </div>
        <div className="col-span-4 h-64 bg-surface md:col-span-8 lg:col-span-4" />
      </div>
    </div>
  );
}
