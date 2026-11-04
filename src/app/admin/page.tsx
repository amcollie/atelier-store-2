import Link from "next/link";

import { AdminPage } from "@/components/admin/admin-page";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

export default function AdminOverviewPage() {
  return (
    <AdminPage path="/admin" title="Overview">
      <ul className="divide-y divide-line border-y border-line">
        {ADMIN_SECTIONS.map((section) => (
          <li key={section.href} className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-center md:gap-8">
            <div className="stack min-w-0 gap-1">
              <h2 className="eyebrow">{section.label}</h2>
              <p className="text-meta text-muted">{section.description}</p>
            </div>
            <Link href={section.href} className="btn btn-text">
              Open {section.label.toLowerCase()}
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}
