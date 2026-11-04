import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/session";

export type AccountSection = "overview" | "orders" | "details";

const sections: { id: AccountSection; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/account" },
  { id: "orders", label: "Orders", href: "/account/orders" },
  { id: "details", label: "Account details", href: "/account/details" },
];

/**
 * Frame for every /account page: heading, section navigation (a sidebar on
 * desktop, a scrolling row on phones) and the page body. Each page passes its
 * own `current`, so the nav needs no client-side pathname. Pages still guard
 * themselves with requireUser().
 */
export function AccountShell({
  current,
  title,
  children,
}: {
  current: AccountSection;
  title: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="section container-page flex-1">
      <div className="grid-page gap-y-8">
        <header className="col-span-4 stack gap-3 md:col-span-8 lg:col-span-12">
          <p className="eyebrow text-muted">My account</p>
          <h1 className="heading-display">{title}</h1>
        </header>

        <nav aria-label="Account" className="col-span-4 md:col-span-8 lg:col-span-3">
          <ul className="scroll-row gap-x-6 border-b border-line pb-3 lg:flex-col lg:gap-y-3 lg:border-b-0 lg:pb-0">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <Link
                  href={s.href}
                  className="eyebrow link-quiet"
                  aria-current={s.id === current ? "page" : undefined}
                >
                  {s.label}
                </Link>
              </li>
            ))}
            <Suspense fallback={null}>
              <AdminNavItem />
            </Suspense>
            <li className="shrink-0 lg:mt-3 lg:border-t lg:border-line lg:pt-6">
              <form action={signOut}>
                <button type="submit" className="eyebrow link-quiet cursor-pointer text-muted hover:text-ink">
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </nav>

        <div className="col-span-4 min-w-0 md:col-span-8 lg:col-span-9">{children}</div>
      </div>
    </main>
  );
}

async function AdminNavItem() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return null;
  return (
    <li className="shrink-0">
      <Link href="/admin" className="eyebrow link-quiet">
        Store admin
      </Link>
    </li>
  );
}

/** Placeholder with the page body's rough shape while the session streams in. */
export function AccountBodySkeleton() {
  return (
    <div className="stack gap-6" aria-busy="true">
      <div className="h-8 w-64 max-w-full bg-surface" />
      <div className="h-40 bg-surface" />
      <div className="h-24 bg-surface" />
    </div>
  );
}
