import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";

import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/session";

// No title anywhere under /admin: non-admins get a 404, so nothing should name the area.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Admin pages render nothing until the role check passes, so navigations into
// them are meant to wait for the server. `instant = false` opts out of instant-UI
// validation, which otherwise reports the check's redirect/404 as a dev error.
// Validation runs per page, so every admin page exports it too.
export const instant = false;

/**
 * Frame for every /admin page. The shell (nav included) renders only after the
 * role check, so non-admins never receive it. This check is not the only one:
 * layouts don't re-render on client navigation, so every page, server action
 * (adminAction) and admin data function (assertAdmin) checks the role again.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<main id="main" className="flex-1" aria-busy="true" />}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  );
}

async function AdminFrame({ children }: { children: ReactNode }) {
  await requireAdmin("/admin");

  return (
    <main id="main" className="section container-page flex-1">
      <div className="grid-page gap-y-8">
        <p className="col-span-4 eyebrow text-muted md:col-span-8 lg:col-span-12">Store admin</p>
        <AdminNav />
        <div className="col-span-4 min-w-0 md:col-span-8 lg:col-span-9">{children}</div>
      </div>
    </main>
  );
}
