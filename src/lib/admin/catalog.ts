import "server-only";

import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { isConstraint } from "@/db/errors";
import { categories, orderItems, orders, products, productStock } from "@/db/schema";
import type { ImageAsset, ProductSize } from "@/lib/catalog-types";
import { assertAdmin } from "@/lib/session";

import type { CreateProductInput, ProductValues } from "./schemas";

// Admin reads and writes for products and stock. Every function checks the
// role itself (assertAdmin) on top of the page/action checks. Reads are
// uncached so admins always see current data; call them inside <Suspense>.
// Callers invalidate the public catalogue (updateTag("catalog")) after writes.

export type AdminProductRow = {
  id: number;
  slug: string;
  name: string;
  imageUrl: string;
  category: { id: number; name: string; parentName: string };
  priceCents: number;
  badge: string | null;
  quantity: number;
  sizeCount: number;
  unavailableSizes: number;
};

export type CategoryOption = { id: number; name: string; children: { id: number; name: string }[] };

export type ProductForEdit = ProductValues & {
  id: number;
  slug: string;
  quantity: number;
  /** Units held by open checkouts (already subtracted from `quantity`). */
  held: number;
  updatedAt: Date;
};

export type FieldErrorResult = { ok: false; fieldErrors: Record<string, string> };

export async function listProducts(filter: { categoryId?: number } = {}): Promise<AdminProductRow[]> {
  await assertAdmin();
  const rows = await db.query.products.findMany({
    where: filter.categoryId ? eq(products.categoryId, filter.categoryId) : undefined,
    with: { category: { with: { parent: true } }, stock: true },
    orderBy: [asc(products.name), asc(products.id)],
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    imageUrl: p.imageUrl,
    category: { id: p.category.id, name: p.category.name, parentName: p.category.parent?.name ?? "" },
    priceCents: p.priceCents,
    badge: p.badge,
    quantity: p.stock?.quantity ?? 0,
    sizeCount: p.sizes?.length ?? 0,
    unavailableSizes: p.sizes?.filter((s) => !s.available).length ?? 0,
  }));
}

/** Top categories with their sub-categories, for the category picker and filter. */
export async function listCategoryOptions(): Promise<CategoryOption[]> {
  await assertAdmin();
  const tops = await db.query.categories.findMany({
    where: isNull(categories.parentId),
    orderBy: [asc(categories.sortOrder), asc(categories.name)],
    with: { children: { orderBy: [asc(categories.sortOrder), asc(categories.name)], columns: { id: true, name: true } } },
  });
  return tops.map((t) => ({ id: t.id, name: t.name, children: t.children }));
}

export async function getProductForEdit(id: number): Promise<ProductForEdit | undefined> {
  await assertAdmin();
  const p = await db.query.products.findFirst({ where: eq(products.id, id), with: { stock: true } });
  if (!p) return undefined;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    price: p.priceCents,
    badge: p.badge,
    styleCode: p.styleCode,
    color: p.color,
    description: p.description,
    details: p.details,
    care: p.care,
    imageUrl: p.imageUrl,
    imageAlt: p.imageAlt,
    gallery: p.gallery,
    sizes: p.sizes,
    quantity: p.stock?.quantity ?? 0,
    held: await heldQuantity(p.id),
    updatedAt: p.updatedAt,
  };
}

/** Units in open checkouts (pending orders hold their stock until paid, failed or expired). */
async function heldQuantity(productId: number): Promise<number> {
  const [row] = await db
    .select({ held: sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.productId, productId), eq(orders.status, "pending")));
  return row?.held ?? 0;
}

/** Products only ever belong to a sub-category; the browser's category id is never trusted. */
async function isSubcategory(categoryId: number): Promise<boolean> {
  const row = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), isNotNull(categories.parentId)),
    columns: { id: true },
  });
  return Boolean(row);
}

function productColumns(v: ProductValues) {
  return {
    name: v.name,
    categoryId: v.categoryId,
    priceCents: v.price,
    badge: v.badge,
    styleCode: v.styleCode,
    color: v.color,
    description: v.description,
    details: v.details,
    care: v.care,
    imageUrl: v.imageUrl,
    imageAlt: v.imageAlt,
    gallery: v.gallery satisfies ImageAsset[],
    sizes: v.sizes satisfies ProductSize[] | null,
  };
}

function uniqueViolation(error: unknown): FieldErrorResult | undefined {
  if (isConstraint(error, "products_slug_unique")) {
    return { ok: false, fieldErrors: { slug: "Another product already uses this slug." } };
  }
  if (isConstraint(error, "products_style_code_unique")) {
    return { ok: false, fieldErrors: { styleCode: "Another product already uses this style code." } };
  }
  return undefined;
}

const NOT_A_SUBCATEGORY: FieldErrorResult = {
  ok: false,
  fieldErrors: { categoryId: "Choose a sub-category, such as Women / Bags." },
};

/**
 * Inserts the product and its stock row in one statement (a data-modifying
 * CTE), so a product never exists without stock. neon-http has no interactive
 * transactions.
 */
export async function createProduct(input: CreateProductInput): Promise<{ ok: true; id: number } | FieldErrorResult> {
  await assertAdmin();
  if (!(await isSubcategory(input.categoryId))) return NOT_A_SUBCATEGORY;

  const inserted = db
    .$with("inserted")
    .as(db.insert(products).values({ ...productColumns(input), slug: input.slug }).returning({ id: products.id }));
  try {
    const [row] = await db
      .with(inserted)
      .insert(productStock)
      .select(
        db
          // Insert-select needs every product_stock column, in table order.
          .select({
            productId: inserted.id,
            quantity: sql<number>`${input.quantity}::int`.as("quantity"),
            updatedAt: sql<Date>`now()`.as("updated_at"),
          })
          .from(inserted),
      )
      .returning({ productId: productStock.productId });
    return { ok: true, id: row.productId };
  } catch (error) {
    const violation = uniqueViolation(error);
    if (violation) return violation;
    throw error;
  }
}

/** Updates everything except the slug (fixed after creation: it's in store URLs and past orders' links). */
export async function updateProduct(
  id: number,
  values: ProductValues,
): Promise<{ ok: true } | { ok: false; notFound: true } | FieldErrorResult> {
  await assertAdmin();
  if (!(await isSubcategory(values.categoryId))) return NOT_A_SUBCATEGORY;
  try {
    const updated = await db
      .update(products)
      .set({ ...productColumns(values), updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning({ id: products.id });
    return updated.length > 0 ? { ok: true } : { ok: false, notFound: true };
  } catch (error) {
    const violation = uniqueViolation(error);
    if (violation) return violation;
    throw error;
  }
}

export type SetStockResult =
  | { ok: true; quantity: number }
  | { ok: false; reason: "conflict"; quantity: number }
  | { ok: false; reason: "not_found" };

/**
 * Sets the available quantity only if it still equals `expected` (what the
 * admin saw). Checkouts hold stock by decrementing this same number, so a blind
 * write could overwrite a hold that started after the page loaded.
 */
export async function setStock(productId: number, expected: number, quantity: number): Promise<SetStockResult> {
  await assertAdmin();
  const [updated] = await db
    .update(productStock)
    .set({ quantity, updatedAt: new Date() })
    .where(and(eq(productStock.productId, productId), eq(productStock.quantity, expected)))
    .returning({ quantity: productStock.quantity });
  if (updated) return { ok: true, quantity: updated.quantity };

  const current = await db.query.productStock.findFirst({ where: eq(productStock.productId, productId) });
  if (current) return { ok: false, reason: "conflict", quantity: current.quantity };

  // No stock row (older data): create it, but only if the admin was looking at 0.
  const product = await db.query.products.findFirst({ where: eq(products.id, productId), columns: { id: true } });
  if (!product) return { ok: false, reason: "not_found" };
  if (expected !== 0) return { ok: false, reason: "conflict", quantity: 0 };
  const [created] = await db
    .insert(productStock)
    .values({ productId, quantity })
    .onConflictDoNothing()
    .returning({ quantity: productStock.quantity });
  return created ? { ok: true, quantity: created.quantity } : { ok: false, reason: "conflict", quantity: 0 };
}
