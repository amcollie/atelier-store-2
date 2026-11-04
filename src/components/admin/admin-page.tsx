import { type ReactNode, Suspense } from "react";

import { requireAdmin } from "@/lib/session";

/**
 * Body of an /admin page: checks the role again (the layout's check doesn't
 * re-run on client navigation), then renders the page heading and content.
 * Everything a page shows must come from `children`, which renders only after
 * the check passes.
 */
export function AdminPage({ path, title, children }: { path: string; title: string; children: ReactNode }) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminPageBody path={path} title={title}>
        {children}
      </AdminPageBody>
    </Suspense>
  );
}

async function AdminPageBody({ path, title, children }: { path: string; title: string; children: ReactNode }) {
  await requireAdmin(path);
  return (
    <div className="stack gap-8">
      <h1 className="heading-display">{title}</h1>
      {children}
    </div>
  );
}

function AdminPageSkeleton() {
  return (
    <div className="stack gap-6" aria-busy="true">
      <div className="h-12 w-64 max-w-full bg-surface" />
      <div className="h-40 bg-surface" />
    </div>
  );
}
