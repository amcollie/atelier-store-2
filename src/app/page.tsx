import Image from "next/image";
import Link from "next/link";

import { ArrowIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { getNewArrivals } from "@/lib/catalog";
import { categoryTiles, editorial, featuredCollections, hero, services } from "@/lib/sample-data";

export default async function HomePage() {
  const newArrivals = await getNewArrivals();

  return (
    <main id="main" className="flex-1">
      {/* Hero: full-bleed campaign image, copy anchored bottom-left */}
      <section className="hero flex items-end bg-surface" aria-labelledby="hero-title">
        <Image
          src={hero.image.src}
          alt={hero.image.alt}
          fill
          preload
          sizes="100vw"
          className="object-cover object-[50%_30%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/10 to-transparent" />
        <div className="theme-inverse relative w-full bg-transparent">
          <div className="container-page stack gap-5 pb-12 md:pb-16 lg:pb-20">
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1 id="hero-title" className="heading-hero max-w-[12ch]">
              {hero.title}
            </h1>
            <p className="max-w-[36ch] text-body">{hero.description}</p>
            <div className="cluster mt-2 gap-3">
              <Link href={hero.primary.href} className="btn btn-primary">
                {hero.primary.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured collections: two tall editorial panels */}
      <section aria-labelledby="collections-title">
        <h2 id="collections-title" className="sr-only">
          Featured collections
        </h2>
        <div className="grid gap-px bg-line md:grid-cols-2">
          {featuredCollections.map((c) => (
            <Link key={c.slug} href={c.href} className="group bg-paper">
              <div className="media-frame aspect-[4/5] lg:aspect-[3/4]">
                <Image
                  src={c.image.src}
                  alt={c.image.alt}
                  fill
                  sizes="(width >= 48rem) 50vw, 100vw"
                  className="transition-transform duration-1000 ease-quiet group-hover:scale-[1.02]"
                />
              </div>
              <div className="flex flex-col items-center gap-2 px-gutter py-8 text-center">
                <h3 className="heading-title">{c.name}</h3>
                <p className="text-meta text-muted">{c.description}</p>
                <span className="btn btn-text mt-2">Shop {c.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals: hairline product grid */}
      <section className="pt-section" aria-labelledby="arrivals-title">
        <div className="container-page mb-8 flex items-end justify-between gap-6 md:mb-10">
          <div className="stack gap-2">
            <p className="eyebrow text-muted">Just in</p>
            <h2 id="arrivals-title" className="heading-display">
              New arrivals
            </h2>
          </div>
          <Link href="/arrivals" className="btn btn-text shrink-0">
            View all
          </Link>
        </div>
        <div className="grid-products border-y border-line bg-line md:max-lg:[&>*:nth-child(n+7)]:hidden">
          {newArrivals.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* Editorial story: copy beside a pair of images */}
      <section className="section container-page" aria-labelledby="editorial-title">
        <div className="grid-page items-center gap-y-10">
          <div className="col-span-4 stack gap-5 md:col-span-8 lg:col-span-4 lg:pr-8">
            <p className="eyebrow text-muted">{editorial.eyebrow}</p>
            <h2 id="editorial-title" className="heading-display">
              {editorial.title}
            </h2>
            <p className="text-lead max-w-prose">{editorial.body}</p>
          </div>
          <div className="col-span-4 grid grid-cols-2 gap-3 md:col-span-8 md:gap-6 lg:col-span-8">
            {editorial.images.map((img, i) => (
              <div key={img.src} className={`media-frame aspect-[3/4] ${i === 1 ? "mt-12 md:mt-24" : ""}`}>
                <Image src={img.src} alt={img.alt} fill sizes="(width >= 64rem) 33vw, 50vw" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category tiles: scroll on phones, three-up from tablet */}
      <section className="pb-section" aria-labelledby="categories-title">
        <div className="container-page mb-8 md:mb-10">
          <h2 id="categories-title" className="heading-display">
            Shop by category
          </h2>
        </div>
        <ul className="scroll-row gap-3 px-gutter scroll-px-gutter md:grid md:grid-cols-3 md:gap-px md:bg-line md:px-0">
          {categoryTiles.map((c) => (
            <li key={c.slug} className="w-[78vw] bg-paper sm:w-[60vw] md:w-auto">
              <Link href={c.href} className="group block">
                <div className="media-frame">
                  <Image
                    src={c.image.src}
                    alt={c.image.alt}
                    fill
                    sizes="(width >= 48rem) 33vw, 78vw"
                    className="transition-transform duration-700 ease-quiet group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex items-center justify-between gap-4 py-4 md:px-4">
                  <div>
                    <h3 className="eyebrow">{c.name}</h3>
                    <p className="text-meta text-muted">{c.description}</p>
                  </div>
                  <ArrowIcon className="shrink-0 transition-transform duration-200 group-hover:translate-x-1" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Services: three quiet cards */}
      <section className="section hairline-top container-page" aria-labelledby="services-title">
        <h2 id="services-title" className="eyebrow mb-8 text-center md:mb-12">
          Atelier services
        </h2>
        <ul className="grid gap-10 md:grid-cols-3 md:gap-6">
          {services.map((s) => (
            <li key={s.title} className="flex flex-col items-center gap-3 text-center">
              <div className="media-frame mb-3 aspect-[3/2] w-full">
                <Image src={s.image.src} alt={s.image.alt} fill sizes="(width >= 48rem) 30vw, 100vw" />
              </div>
              <h3 className="eyebrow">{s.title}</h3>
              <p className="text-meta text-muted">{s.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
