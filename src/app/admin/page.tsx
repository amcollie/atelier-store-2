import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/lib/session";

// No title: non-admins get a 404, so the page shouldn't name itself.
export const metadata: Metadata = { robots: { index: false } };

// Everything sits behind the boundary so nothing about the page renders before the role check.
export default function AdminPage() {
  return (
    <Suspense fallback={<main id="main" className="flex-1" aria-busy="true" />}>
      <AdminDashboard />
    </Suspense>
  );
}

async function AdminDashboard() {
  const user = await requireAdmin("/admin");

  return (
    <main id="main" className="section container-page flex-1">
      <div className="stack max-w-xl gap-6">
        <header className="stack gap-3">
          <p className="eyebrow text-muted">Admin</p>
          <h1 className="heading-display">Dashboard</h1>
        </header>
        <p className="text-meta text-muted">
          Signed in as {user.name} ({user.email}), admin.
        </p>
        <p className="border-y border-line py-6 text-meta text-muted">Store management tools will live here.</p>
      </div>
    </main>
  );
}
