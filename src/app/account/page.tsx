import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { signOut } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

const memberSince = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export default function AccountPage() {
  return (
    <main id="main" className="section container-page flex-1">
      <div className="stack max-w-xl gap-8">
        <header className="stack gap-3">
          <p className="eyebrow text-muted">Account</p>
          <h1 className="heading-display">My account</h1>
        </header>
        <Suspense fallback={<div className="h-48 bg-surface" aria-busy="true" />}>
          <AccountDetails />
        </Suspense>
      </div>
    </main>
  );
}

async function AccountDetails() {
  const user = await requireUser("/account");

  return (
    <div className="stack gap-8">
      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-y border-line py-6 text-meta">
        <dt className="text-muted">Name</dt>
        <dd>{user.name}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="break-all">{user.email}</dd>
        <dt className="text-muted">Member since</dt>
        <dd>{memberSince.format(user.createdAt)}</dd>
      </dl>
      <div className="cluster gap-x-6 gap-y-4">
        <form action={signOut}>
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
        {user.role === "admin" ? (
          <Link href="/admin" className="btn btn-text">
            Admin
          </Link>
        ) : null}
      </div>
    </div>
  );
}
