import type { Metadata } from "next";
import Link from "next/link";
import { type ReactNode, Suspense } from "react";

import { AccountBodySkeleton, AccountShell } from "@/components/account-shell";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default function AccountOverviewPage() {
  return (
    <AccountShell current="overview" title="Overview">
      <Suspense fallback={<AccountBodySkeleton />}>
        <Overview />
      </Suspense>
    </AccountShell>
  );
}

async function Overview() {
  const user = await requireUser("/account");
  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <div className="stack gap-8">
      <div className="stack gap-2">
        <h2 className="heading-title normal-case">Welcome back, {firstName}</h2>
        <p className="text-meta break-all text-muted">Signed in as {user.email}</p>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        <OverviewItem title="Orders" description="Your orders, their payment status and details.">
          <Link href="/account/orders" className="btn btn-text">
            View orders
          </Link>
        </OverviewItem>
        <OverviewItem
          title="Account details"
          description={
            <>
              {user.name} · <span className="break-all">{user.email}</span>
            </>
          }
        >
          <Link href="/account/details" className="btn btn-text">
            View details
          </Link>
        </OverviewItem>
        <OverviewItem title="New arrivals" description="The latest pieces from the atelier, newest first.">
          <Link href="/arrivals" className="btn btn-text">
            Shop new arrivals
          </Link>
        </OverviewItem>
      </ul>
    </div>
  );
}

function OverviewItem({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <li className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
      <div className="stack min-w-0 gap-1">
        <h3 className="eyebrow">{title}</h3>
        <p className="text-meta text-muted">{description}</p>
      </div>
      <div className="cluster gap-x-6 gap-y-3">{children}</div>
    </li>
  );
}
