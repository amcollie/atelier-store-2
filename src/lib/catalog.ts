import "server-only";

import { desc, eq, inArray, ne, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { db } from "@/db";
import { categories, products } from "@/db/schema";
import type { CategoryRef, Product } from "@/lib/catalog-types";

// Catalogue reads. Every query is cached under the "catalog" tag so pages stay
// prerendered; call updateTag/revalidateTag("catalog") after changing data.

const LOW_STOCK_THRESHOLD = 5;

export const SHIPPING_COPY =
  "Complimentary standard shipping on every order, delivered in 2–4 business days. Returns are free within 30 days in original condition with tags attached.";

export const categoryHref = ({ slug, parent }: CategoryRef & { parent?: CategoryRef | null }) =>
  parent ? `/collections/${parent.slug}/${slug}` : `/collections/${slug}`;

const withRelations = {
  category: { with: { parent: true } },
  stock: true,
} as const;

type ProductRow = NonNullable<
  Awaited<ReturnType<typeof db.query.products.findFirst<{ with: typeof withRelations }>>>
>;

function toStock(quantity: number): Product["stock"] {
  if (quantity <= 0) return { status: "out_of_stock" };
  if (quantity <= LOW_STOCK_THRESHOLD) return { status: "low_stock", quantity };
  return { status: "in_stock" };
}

function toProduct(row: ProductRow): Product {
  const { category } = row;
  if (!category.parent) {
    throw new Error(`Product "${row.slug}" must belong to a sub-category, not "${category.slug}".`);
  }
  return {
    slug: row.slug,
    name: row.name,
    category: {
      slug: category.slug,
      name: category.name,
      parent: { slug: category.parent.slug, name: category.parent.name },
    },
    priceCents: row.priceCents,
    badge: row.badge ?? undefined,
    styleCode: row.styleCode,
    color: row.color,
    stock: toStock(row.stock?.quantity ?? 0),
    sizes: row.sizes ?? undefined,
    image: { src: row.imageUrl, alt: row.imageAlt },
    gallery: row.gallery,
    description: row.description,
    details: row.details,
    care: row.care,
  };
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const rows = await db.query.products.findMany({
    with: withRelations,
    orderBy: [desc(products.createdAt), desc(products.id)],
    limit,
  });
  return rows.map(toProduct);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const row = await db.query.products.findFirst({
    with: withRelations,
    where: eq(products.slug, slug),
  });
  return row ? toProduct(row) : undefined;
}

/** Same sub-category first, then the same top category, then everything else. */
export async function getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const [current] = await db
    .select({ categoryId: products.categoryId, parentId: categories.parentId })
    .from(products)
    .innerJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.slug, slug));
  if (!current) return [];

  const siblingCategoryIds = current.parentId
    ? db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, current.parentId))
    : null;

  const rows = await db.query.products.findMany({
    with: withRelations,
    where: ne(products.slug, slug),
    orderBy: (p) => [
      desc(sql`${p.categoryId} = ${current.categoryId}`),
      ...(siblingCategoryIds ? [desc(sql`${inArray(p.categoryId, siblingCategoryIds)}`)] : []),
      desc(p.createdAt),
      desc(p.id),
    ],
    limit,
  });
  return rows.map(toProduct);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");

  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((r) => r.slug);
}
