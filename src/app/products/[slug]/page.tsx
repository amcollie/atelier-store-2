import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Disclosure } from "@/components/disclosure";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchase } from "@/components/product-purchase";
import { StockStatus } from "@/components/stock-status";
import { categoryHref, getProduct, getProductSlugs, getRelatedProducts, SHIPPING_COPY } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [{ url: product.image.src, alt: product.image.alt }] },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.slug);
  const { category } = product;
  const soldOut = product.stock.status === "out_of_stock";

  return (
    <main id="main" className="flex-1">
      <div className="lg:grid lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery images={[product.image, ...product.gallery]} />
        </div>

        {/* Product info: sticky beside the gallery on desktop */}
        <div className="lg:col-span-5">
          <div className="container-page stack gap-8 py-8 md:py-10 lg:sticky lg:top-header lg:px-12 lg:py-12 xl:px-16">
            <div className="stack gap-4">
              <nav aria-label="Breadcrumb">
                <ol className="cluster gap-2 text-meta text-muted">
                  <li>
                    <Link href="/" className="link-quiet">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href={categoryHref(category.parent)} className="link-quiet">
                      {category.parent.name}
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href={categoryHref(category)} className="link-quiet">
                      {category.name}
                    </Link>
                  </li>
                </ol>
              </nav>

              {product.badge && !soldOut ? <p className="eyebrow">{product.badge}</p> : null}

              <h1 className="heading-title">{product.name}</h1>

              <p className={`text-body font-medium ${soldOut ? "text-muted" : ""}`}>
                {formatPrice(product.priceCents)}
              </p>

              <StockStatus stock={product.stock} />
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-meta">
              <dt className="text-muted">Colour</dt>
              <dd>{product.color}</dd>
              {product.sizes?.length === 1 ? (
                <>
                  <dt className="text-muted">Size</dt>
                  <dd>{product.sizes[0].label}</dd>
                </>
              ) : null}
              <dt className="text-muted">Category</dt>
              <dd>
                <Link href={categoryHref(category)} className="link">
                  {category.parent.name} › {category.name}
                </Link>
              </dd>
              <dt className="text-muted">Style</dt>
              <dd className="tabular-nums">{product.styleCode}</dd>
            </dl>

            <ProductPurchase product={product} />

            <p className="max-w-prose">{product.description}</p>

            <div className="border-b border-line">
              <Disclosure title="Product details" defaultOpen>
                <ul className="stack gap-1.5">
                  {product.details.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span aria-hidden="true">—</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </Disclosure>
              {product.sizes && product.sizes.length > 1 ? (
                <Disclosure title="Size & fit" id="size-guide">
                  <p>
                    True to size. Available in {product.sizes.map((s) => s.label).join(", ")}. Book an appointment for a
                    personal fitting.
                  </p>
                </Disclosure>
              ) : null}
              <Disclosure title="Materials & care">
                <p>{product.care}</p>
              </Disclosure>
              <Disclosure title="Shipping & returns">
                <p>{SHIPPING_COPY}</p>
              </Disclosure>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="pt-section" aria-labelledby="related-title">
          <div className="container-page mb-8 flex items-end justify-between gap-6 md:mb-10">
            <h2 id="related-title" className="heading-display">
              You may also like
            </h2>
            <Link href={categoryHref(category)} className="btn btn-text shrink-0">
              Shop {category.name}
            </Link>
          </div>
          <div className="grid-products border-y border-line bg-line md:max-lg:[&>*:nth-child(n+4)]:hidden">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
