// zod schemas for admin forms. No server-only import: the client forms run the
// same schemas for instant feedback, and every server action parses again and
// never trusts the client's result. Checks that need the database (the
// category is a sub-category, slug/style code are unique) live in
// src/lib/admin/catalog.ts after these pass.

import { z } from "zod";

import type { ImageAsset, ProductSize } from "@/lib/catalog-types";
import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";

export const PRODUCT_LIMITS = {
  name: 120,
  slug: 80,
  badge: 20,
  styleCode: 40,
  color: 60,
  description: 2000,
  care: 1000,
  detailLines: 12,
  detailLength: 200,
  galleryImages: 8,
  alt: 200,
  sizes: 12,
  sizeLabel: 12,
  maxPriceCents: 100_000_000, // $1,000,000
  maxStock: 99_999,
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Technical Bomber Jacket!" → "technical-bomber-jacket". */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_LIMITS.slug)
    .replace(/-+$/g, "");
}

const tooLong = (max: number) => `Use ${max} characters or fewer.`;

const requiredText = (missing: string, max: number) =>
  z.string().trim().min(1, missing).max(max, tooLong(max));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .transform((v) => (v === "" ? null : v));

const imageUrl = z
  .string()
  .trim()
  .min(1, "Enter an image URL.")
  .refine(isAllowedImageUrl, `Use an https image URL from ${ALLOWED_IMAGE_HOSTS}.`);

const wholeNumber = (what: string, max: number) =>
  z.coerce
    .number({ error: `Enter ${what} as a whole number.` })
    .int(`Enter ${what} as a whole number.`)
    .min(0, `${what[0].toUpperCase()}${what.slice(1)} can't be negative.`)
    .max(max, `Use ${max.toLocaleString("en-US")} or less.`);

/** "$1,320.50" → 132050. Dollars in, integer cents out, never a float. */
const price = z.string().transform((raw, ctx) => {
  const value = raw.trim().replace(/[$,\s]/g, "");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(value)) {
    ctx.addIssue({ code: "custom", message: "Enter a price in dollars, like 480 or 480.00." });
    return z.NEVER;
  }
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > PRODUCT_LIMITS.maxPriceCents) {
    ctx.addIssue({ code: "custom", message: "Use a price of $1,000,000 or less." });
    return z.NEVER;
  }
  return cents;
});

/** One detail per non-empty line. */
const details = z.string().transform((raw, ctx) => {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > PRODUCT_LIMITS.detailLines) {
    ctx.addIssue({ code: "custom", message: `Use ${PRODUCT_LIMITS.detailLines} lines or fewer.` });
    return z.NEVER;
  }
  const long = lines.findIndex((l) => l.length > PRODUCT_LIMITS.detailLength);
  if (long !== -1) {
    ctx.addIssue({ code: "custom", message: `Line ${long + 1}: ${tooLong(PRODUCT_LIMITS.detailLength)}` });
    return z.NEVER;
  }
  return lines;
});

/** Extra photos, one "https://… | alt text" per line. */
const gallery = z.string().transform((raw, ctx): ImageAsset[] => {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > PRODUCT_LIMITS.galleryImages) {
    ctx.addIssue({ code: "custom", message: `Use ${PRODUCT_LIMITS.galleryImages} images or fewer.` });
    return z.NEVER;
  }
  const images: ImageAsset[] = [];
  for (const [i, line] of lines.entries()) {
    const bar = line.indexOf("|");
    const src = (bar === -1 ? line : line.slice(0, bar)).trim();
    const alt = bar === -1 ? "" : line.slice(bar + 1).trim();
    if (!isAllowedImageUrl(src)) {
      ctx.addIssue({ code: "custom", message: `Line ${i + 1}: use an https image URL from ${ALLOWED_IMAGE_HOSTS}.` });
      return z.NEVER;
    }
    if (!alt) {
      ctx.addIssue({ code: "custom", message: `Line ${i + 1}: add alt text after a "|", like "https://… | Back view".` });
      return z.NEVER;
    }
    if (alt.length > PRODUCT_LIMITS.alt) {
      ctx.addIssue({ code: "custom", message: `Line ${i + 1}: ${tooLong(PRODUCT_LIMITS.alt)}` });
      return z.NEVER;
    }
    images.push({ src, alt });
  }
  return images;
});

/** Comma-separated labels plus the ones ticked as available; no labels = one size (null). */
const sizes = z
  .object({ labels: z.string(), available: z.array(z.string()) })
  .transform(({ labels, available }, ctx): ProductSize[] | null => {
    const list = parseSizeLabels(labels);
    if (list.length === 0) return null;
    if (list.length > PRODUCT_LIMITS.sizes) {
      ctx.addIssue({ code: "custom", message: `Use ${PRODUCT_LIMITS.sizes} sizes or fewer.` });
      return z.NEVER;
    }
    const long = list.find((l) => l.length > PRODUCT_LIMITS.sizeLabel);
    if (long) {
      ctx.addIssue({ code: "custom", message: `"${long}" is too long: use ${PRODUCT_LIMITS.sizeLabel} characters or fewer.` });
      return z.NEVER;
    }
    const seen = new Set<string>();
    for (const label of list) {
      const key = label.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", message: `"${label}" is listed twice.` });
        return z.NEVER;
      }
      seen.add(key);
    }
    const open = new Set(available);
    return list.map((label) => ({ label, available: open.has(label) }));
  });

/** "XS, S , M" → ["XS", "S", "M"]. Shared with the form, which shows a checkbox per label. */
export function parseSizeLabels(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const productFields = {
  name: requiredText("Enter a product name.", PRODUCT_LIMITS.name),
  categoryId: z.coerce
    .number({ error: "Choose a sub-category." })
    .int("Choose a sub-category.")
    .positive("Choose a sub-category."),
  price,
  badge: optionalText(PRODUCT_LIMITS.badge),
  styleCode: requiredText("Enter a style code.", PRODUCT_LIMITS.styleCode),
  color: requiredText("Enter a colour.", PRODUCT_LIMITS.color),
  description: requiredText("Enter a description.", PRODUCT_LIMITS.description),
  details,
  care: requiredText("Enter care instructions.", PRODUCT_LIMITS.care),
  imageUrl,
  imageAlt: requiredText("Describe the main image for screen readers.", PRODUCT_LIMITS.alt),
  gallery,
  sizes,
};

export const updateProductSchema = z.object({
  id: z.coerce.number().int().positive(),
  ...productFields,
});

export const createProductSchema = z.object({
  ...productFields,
  slug: z
    .string()
    .trim()
    .min(1, "Enter a URL slug.")
    .max(PRODUCT_LIMITS.slug, tooLong(PRODUCT_LIMITS.slug))
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens, like technical-bomber-jacket."),
  quantity: wholeNumber("the quantity", PRODUCT_LIMITS.maxStock),
});

export const stockSchema = z.object({
  productId: z.coerce.number().int().positive(),
  expected: z.coerce.number().int().min(0),
  quantity: wholeNumber("the quantity", PRODUCT_LIMITS.maxStock),
});

export type CreateProductInput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.output<typeof updateProductSchema>;
export type ProductValues = Omit<UpdateProductInput, "id">;

const str = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
};

/** The raw object the product schemas expect, read from the form. */
export function productFormInput(formData: FormData) {
  return {
    id: str(formData, "id"),
    name: str(formData, "name"),
    slug: str(formData, "slug"),
    categoryId: str(formData, "categoryId"),
    price: str(formData, "price"),
    badge: str(formData, "badge"),
    styleCode: str(formData, "styleCode"),
    color: str(formData, "color"),
    description: str(formData, "description"),
    details: str(formData, "details"),
    care: str(formData, "care"),
    imageUrl: str(formData, "imageUrl"),
    imageAlt: str(formData, "imageAlt"),
    gallery: str(formData, "gallery"),
    sizes: {
      labels: str(formData, "sizes"),
      available: formData.getAll("sizeAvailable").filter((v): v is string => typeof v === "string"),
    },
    quantity: str(formData, "quantity"),
  };
}

export function stockFormInput(formData: FormData) {
  return {
    productId: str(formData, "productId"),
    expected: str(formData, "expected"),
    quantity: str(formData, "quantity"),
  };
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; fieldErrors: Record<string, string> };

/** safeParse with errors keyed by top-level field (first message wins), for inline form errors. */
export function parseWith<S extends z.ZodType>(schema: S, input: unknown): ParseResult<z.output<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
