import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { AccountBodySkeleton, AccountShell } from "@/components/account-shell";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Account details", robots: { index: false } };

const fullDate = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" });

export default function AccountDetailsPage() {
  return (
    <AccountShell current="details" title="Account details">
      <Suspense fallback={<AccountBodySkeleton />}>
        <Details />
      </Suspense>
    </AccountShell>
  );
}

async function Details() {
  const user = await requireUser("/account/details");

  return (
    <div className="stack max-w-2xl gap-8">
      <section aria-labelledby="personal-title" className="stack gap-4">
        <h2 id="personal-title" className="eyebrow">
          Personal information
        </h2>
        <dl className="divide-y divide-line border-y border-line text-meta">
          <DetailRow label="Name" value={user.name} />
          <DetailRow label="Email" value={<span className="break-all">{user.email}</span>} />
        </dl>
      </section>

      <section aria-labelledby="account-title" className="stack gap-4">
        <h2 id="account-title" className="eyebrow">
          Account
        </h2>
        <dl className="divide-y divide-line border-y border-line text-meta">
          <DetailRow label="Member since" value={fullDate.format(user.createdAt)} />
          <DetailRow label="Sign-in method" value="Email and password" />
        </dl>
      </section>

      <p className="text-meta text-muted">
        To change your name or email address,{" "}
        <Link href="/contact" className="link text-ink">
          contact client services
        </Link>
        .
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0">{value}</dd>
    </div>
  );
}
