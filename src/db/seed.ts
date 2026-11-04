// Loads the initial catalogue into an empty database. Idempotent and insert-only:
// rows that already exist (matched by natural key) are left alone, so re-running
// it never overwrites what admins changed in /admin.
// Run with `pnpm db:seed` (reads DATABASE_URL from .env.local).

import { and, eq, isNull } from "drizzle-orm";

import { db } from "./index";
import { categories, products, productStock } from "./schema";
import { seedCategories, seedProducts } from "./seed-data";

async function upsertCategory(values: typeof categories.$inferInsert) {
  const [row] = await db
    .insert(categories)
    .values(values)
    .onConflictDoNothing({ target: [categories.parentId, categories.slug] })
    .returning({ id: categories.id });
  if (row) return row.id;
  const existing = await db.query.categories.findFirst({
    where: and(
      values.parentId == null ? isNull(categories.parentId) : eq(categories.parentId, values.parentId),
      eq(categories.slug, values.slug),
    ),
    columns: { id: true },
  });
  if (!existing) throw new Error(`Category "${values.slug}" exists but could not be read back.`);
  return existing.id;
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
  let added = 0;
  let skipped = 0;
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
      .onConflictDoNothing({ target: products.slug })
      .returning({ id: products.id });
    if (!row) {
      skipped += 1;
      continue;
    }

    await db.insert(productStock).values({ productId: row.id, quantity }).onConflictDoNothing();
    added += 1;
  }

  console.log(`Seed: ${subCategoryIds.size} sub-categories checked; ${added} products added, ${skipped} already present (left unchanged).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
