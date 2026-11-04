import { AdminPage } from "@/components/admin/admin-page";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";

// Blocks on the role check; see src/app/admin/layout.tsx.
export const instant = false;

const section = ADMIN_SECTIONS.find((s) => s.href === "/admin/orders")!;

export default function AdminOrdersPage() {
  return (
    <AdminPage path={section.href} title={section.label}>
      <p className="border-y border-line py-6 text-meta text-muted">{section.description} Coming in the next step.</p>
    </AdminPage>
  );
}
