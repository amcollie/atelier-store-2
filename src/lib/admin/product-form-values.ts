import type { ProductFormValues } from "@/components/admin/product-form";

import type { ProductForEdit } from "./catalog";

// Converts stored product data to the strings the product form edits.

/** 132050 → "1320.50", 48000 → "480". */
export function centsToDollars(cents: number): string {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(whole) : `${whole}.${String(rest).padStart(2, "0")}`;
}

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "",
  slug: "",
  categoryId: "",
  price: "",
  badge: "",
  styleCode: "",
  color: "",
  description: "",
  details: "",
  care: "",
  imageUrl: "",
  imageAlt: "",
  gallery: "",
  sizes: "",
  unavailableSizes: [],
  quantity: "0",
};

export function toFormValues(p: ProductForEdit): ProductFormValues {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    categoryId: String(p.categoryId),
    price: centsToDollars(p.price),
    badge: p.badge ?? "",
    styleCode: p.styleCode,
    color: p.color,
    description: p.description,
    details: p.details.join("\n"),
    care: p.care,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    gallery: p.gallery.map((g) => `${g.src} | ${g.alt}`).join("\n"),
    sizes: (p.sizes ?? []).map((s) => s.label).join(", "),
    unavailableSizes: (p.sizes ?? []).filter((s) => !s.available).map((s) => s.label),
    quantity: String(p.quantity),
  };
}
