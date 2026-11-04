import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BagLines } from "@/components/bag-lines";
import { CheckoutButton } from "@/components/checkout-button";
import { getCart } from "@/lib/cart";
import { SHIPPING_COPY } from "@/lib/catalog";
import { formatPrice } from "@/lib/sample-data";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Shopping bag", robots: { index: false } };

export default function BagPage({ searchParams }: PageProps<"/bag">) {
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
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h1 id="bag-title" tabIndex={-1} className="heading-display outline-none">
            Shopping bag
          </h1>
          <Suspense fallback={null}>
            <BagCount />
          </Suspense>
        </div>
      </header>

      <Suspense fallback={<BagSkeleton />}>
        <BagContents searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function BagContents({ searchParams }: { searchParams: PageProps<"/bag">["searchParams"] }) {
  const [cart, user, params] = await Promise.all([getCart(), getCurrentUser(), searchParams]);
  // Set by the checkout return routes and by startCheckout when the bag no longer matches stock.
  const checkoutNotice =
    params.checkout === "canceled" ? (
      <p className="border-l-2 border-line-strong py-1 pl-4 text-meta" role="status">
        Checkout canceled. You haven&rsquo;t been charged, and your bag is just as you left it.
      </p>
    ) : params.checkout === "changed" || params.checkout === "unavailable" ? (
      <p className="border-l-2 border-warning py-1 pl-4 text-meta text-warning" role="alert">
        {params.checkout === "changed"
          ? "Stock changed before we could start checkout, so we’ve updated your bag to match. Review it, then check out again."
          : "Someone just bought the last of an item in your bag. Review your bag, then check out again."}
      </p>
    ) : null;

  if (cart.lines.length === 0) {
    return (
      <section
        aria-labelledby="empty-title"
        className="section container-page flex flex-col items-center gap-5 border-t border-line text-center"
      >
        <h2 id="empty-title" className="heading-title">
          Your bag is empty
        </h2>
        <p className="max-w-prose text-muted">
          Pieces you add will be kept here on this device for 30 days, whether or not you&rsquo;re signed in.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Link href="/arrivals" className="btn btn-primary">
            Shop new arrivals
          </Link>
          <Link href="/" className="btn btn-secondary">
            Return home
          </Link>
        </div>
      </section>
    );
  }

  const reduced = cart.lines.some((l) => l.issue === "reduced");
  const excluded = cart.lines.filter((l) => l.qty === 0).length;
  const notice = [
    reduced ? "Some quantities were lowered to match what’s in stock." : null,
    excluded > 0
      ? excluded === 1
        ? "One item is no longer available and isn’t included in your subtotal."
        : `${excluded} items are no longer available and aren’t included in your subtotal.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="container-page pb-section">
      <div className="grid-page gap-y-10">
        <section aria-labelledby="bag-items-title" className="col-span-4 md:col-span-8 lg:col-span-8">
          <h2 id="bag-items-title" className="sr-only">
            Items
          </h2>
          {checkoutNotice ? <div className="mb-6">{checkoutNotice}</div> : null}
          {notice ? (
            <p className="mb-6 border-l-2 border-warning py-1 pl-4 text-meta text-warning" role="status">
              {notice}
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
                <dd className="tabular-nums">{formatPrice(cart.subtotalCents)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Shipping</dt>
                <dd>Complimentary</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-3">
                <dt className="font-medium">Total</dt>
                <dd className="font-medium tabular-nums">{formatPrice(cart.subtotalCents)}</dd>
              </div>
            </dl>
            {excluded > 0 ? (
              <p className="text-meta text-muted">Unavailable items aren&rsquo;t included in the subtotal.</p>
            ) : null}
            <p className="text-meta text-muted">{SHIPPING_COPY}</p>
            {excluded > 0 ? (
              <div className="stack gap-3">
                <button type="button" className="btn btn-primary btn-block" disabled>
                  Checkout
                </button>
                <p className="text-meta text-warning">Remove unavailable items to check out.</p>
              </div>
            ) : user ? (
              <CheckoutButton />
            ) : (
              <div className="stack gap-3">
                <Link href={`/sign-in?callbackURL=${encodeURIComponent("/bag")}`} className="btn btn-primary btn-block">
                  Sign in to check out
                </Link>
                <p className="text-meta text-muted">
                  New to Atelier?{" "}
                  <Link href={`/sign-up?callbackURL=${encodeURIComponent("/bag")}`} className="link">
                    Create an account
                  </Link>
                  . Your bag stays as it is.
                </p>
              </div>
            )}
            <Link href="/arrivals" className="link self-center text-meta">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function BagCount() {
  const { count } = await getCart();
  if (count === 0) return null;
  return (
    <p className="text-meta text-muted tabular-nums">
      {count} {count === 1 ? "item" : "items"}
    </p>
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
