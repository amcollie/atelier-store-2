// Loads the initial catalogue. Idempotent: categories, products and stock are
// upserted by their natural keys, so it is safe to re-run.
// Run with `pnpm db:seed` (reads DATABASE_URL from .env.local).

import { sql } from "drizzle-orm";

import { db } from "./index";
import { categories, products, productStock } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

async function upsertCategory(values: typeof categories.$inferInsert) {
  const [row] = await db
    .insert(categories)
    .values(values)
    .onConflictDoUpdate({
      target: [categories.parentId, categories.slug],
      set: { name: values.name, sortOrder: values.sortOrder },
    })
    .returning({ id: categories.id });
  return row.id;
}

async function main() {
  // "women/bags" -> sub-category id. Only sub-categories go in here, so a
  // product pointing at a top category fails the lookup below.
  const subCategoryIds = new Map<string, number>();

  for (const [i, top] of seedCategories.entries()) {
    const topId = await upsertCategory({ parentId: null, slug: top.slug, name: top.name, sortOrder: i });
    for (const [j, sub] of top.children.entries()) {
      const subId = await upsertCategory({ parentId: topId, slug: sub.slug, name: sub.name, sortOrder: j });
      subCategoryIds.set(`${top.slug}/${sub.slug}`, subId);
    }
  }

  const now = Date.now();
  for (const [i, { category, quantity, image, ...p }] of seedProducts.entries()) {
    const categoryId = subCategoryIds.get(category.join("/"));
    if (!categoryId) throw new Error(`${p.slug}: unknown sub-category "${category.join("/")}"`);

    const values = {
      ...p,
      categoryId,
      badge: p.badge ?? null,
      sizes: p.sizes ?? null,
      imageUrl: image.src,
      imageAlt: image.alt,
      // Stagger so the array order is the "new arrivals" order (newest first).
      createdAt: new Date(now - i * 60_000),
    };

    const [row] = await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: { ...values, updatedAt: sql`now()` } })
      .returning({ id: products.id });

    await db
      .insert(productStock)
      .values({ productId: row.id, quantity })
      .onConflictDoUpdate({ target: productStock.productId, set: { quantity, updatedAt: sql`now()` } });
  }

  console.log(`Seeded ${subCategoryIds.size} sub-categories and ${seedProducts.length} products.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
