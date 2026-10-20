import Link from "next/link";

import { NewsletterForm } from "@/components/newsletter-form";

const columns = [
  {
    title: "Client services",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "Shipping", href: "/help/shipping" },
      { label: "Returns", href: "/help/returns" },
      { label: "FAQs", href: "/help" },
    ],
  },
  {
    title: "The house",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Craftsmanship", href: "/stories/made-slowly" },
      { label: "Sustainability", href: "/sustainability" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of sale", href: "/legal/terms" },
      { label: "Accessibility", href: "/accessibility" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="theme-inverse">
      <section className="section container-page flex flex-col items-center gap-4 text-center">
        <p className="eyebrow">Newsletter</p>
        <p className="text-lead max-w-prose">
          New arrivals, private appointments and stories from the workshop.
        </p>
        <div className="mt-2 w-full max-w-narrow">
          <NewsletterForm />
        </div>
      </section>

      <div className="container-page grid-page gap-y-10 pb-section hairline-top pt-12">
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="col-span-2 stack gap-4 md:col-span-2 lg:col-span-3">
            <h2 className="eyebrow text-muted">{col.title}</h2>
            <ul className="stack gap-2 text-meta">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="link-quiet">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="col-span-2 stack gap-4 md:col-span-2 lg:col-span-3">
          <h2 className="eyebrow text-muted">Region</h2>
          <p className="text-meta">United States · English · USD</p>
        </div>
      </div>

      <div className="container-page pb-10">
        <p className="select-none text-center text-[clamp(3.5rem,18vw,16rem)] leading-none font-thin uppercase tracking-[0.2em] -mr-[0.2em]" aria-hidden="true">
          Atelier
        </p>
        <p className="mt-8 text-center text-micro text-muted">© 2026 Atelier. All rights reserved.</p>
      </div>
    </footer>
  );
}
