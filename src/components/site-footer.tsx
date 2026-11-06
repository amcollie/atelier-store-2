import { NewsletterForm } from "@/components/newsletter-form";

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
