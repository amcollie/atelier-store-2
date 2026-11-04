// The admin area's sections, shared by the navigation (client) and the overview page.

export type AdminSection = {
  href: string;
  label: string;
  description: string;
};

export const ADMIN_HOME = { href: "/admin", label: "Overview" } as const;

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/admin/products", label: "Products", description: "View, create and edit products." },
  { href: "/admin/categories", label: "Categories", description: "Manage the sub-categories under Women, Men and Unisex." },
  { href: "/admin/stock", label: "Stock", description: "See what's available and held in checkouts, and update quantities." },
  { href: "/admin/orders", label: "Orders", description: "Every customer's orders, with payment status and details." },
];
