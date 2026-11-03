"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import { CloseIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";

type NavItem = { label: string; href: string };

/** `bag` is a server-rendered slot (the cart count reads a cookie, so it streams in Suspense). */
export function SiteHeader({ navigation, bag }: { navigation: NavItem[]; bag: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const desktop = window.matchMedia("(width >= 64rem)");
    const onResize = () => desktop.matches && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 bg-paper hairline">
      <div className="container-page grid h-header grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center">
          <button
            type="button"
            className="btn btn-icon -ml-2.5 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="cluster gap-6">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="eyebrow link-quiet">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link href="/" className="text-title font-normal uppercase tracking-[0.35em] -mr-[0.35em] lg:text-display">
          Atelier
        </Link>

        <div className="flex items-center justify-end -mr-2.5">
          <Link href="/search" className="btn btn-icon" aria-label="Search">
            <SearchIcon />
          </Link>
          <Link href="/account" className="btn btn-icon hidden sm:inline-flex" aria-label="Account">
            <UserIcon />
          </Link>
          {bag}
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="absolute inset-x-0 top-full h-[calc(100dvh-var(--header-height))] overflow-y-auto bg-paper hairline-top lg:hidden"
      >
        <nav aria-label="Mobile" className="container-page py-6">
          <ul>
            {navigation.map((item) => (
              <li key={item.href} className="hairline">
                <Link href={item.href} className="heading-title block py-4" onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="stack mt-8 gap-3">
            <Link href="/account" className="eyebrow link-quiet" onClick={() => setOpen(false)}>
              My account
            </Link>
            <Link href="/services/appointments" className="eyebrow link-quiet" onClick={() => setOpen(false)}>
              Book an appointment
            </Link>
            <Link href="/contact" className="eyebrow link-quiet" onClick={() => setOpen(false)}>
              Contact us
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
