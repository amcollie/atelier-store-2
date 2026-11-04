"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ADMIN_HOME, ADMIN_SECTIONS } from "@/lib/admin/sections";

// Section navigation for the admin layout. A client component only so the
// current section can be marked from the URL: the layout persists across admin
// pages, so it can't take a `current` prop the way AccountShell does.
export function AdminNav() {
  const pathname = usePathname();
  const items = [ADMIN_HOME, ...ADMIN_SECTIONS];
  const isCurrent = (href: string) =>
    href === ADMIN_HOME.href ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Admin" className="col-span-4 md:col-span-8 lg:col-span-3">
      <ul className="scroll-row gap-x-6 border-b border-line pb-3 lg:flex-col lg:gap-y-3 lg:border-b-0 lg:pb-0">
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              className="eyebrow link-quiet"
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
        <li className="shrink-0 lg:mt-3 lg:border-t lg:border-line lg:pt-6">
          <Link href="/" className="eyebrow link-quiet text-muted hover:text-ink">
            Back to store
          </Link>
        </li>
      </ul>
    </nav>
  );
}
