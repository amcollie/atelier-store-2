import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import type { ImageAsset, ProductSize } from "../lib/catalog-types";

// Two-level tree: top categories (Women, Men, Unisex) have no parent; every
// other category is a sub-category of one of them. Depth and "products only
// point at sub-categories" are enforced in the seed and data-access code.
export const categories = pgTable(
  "categories",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    parentId: integer("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
    slug: text().notNull(),
    name: text().notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("categories_parent_slug_unique").on(t.parentId, t.slug).nullsNotDistinct(),
    index("categories_parent_id_idx").on(t.parentId),
    check("categories_not_own_parent", sql`${t.parentId} <> ${t.id}`),
  ],
);

export const products = pgTable(
  "products",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: text().notNull().unique(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    name: text().notNull(),
    priceCents: integer("price_cents").notNull(),
    badge: text(),
    styleCode: text("style_code").notNull().unique(),
    color: text().notNull(),
    description: text().notNull(),
    details: text().array().notNull().default(sql`'{}'::text[]`),
    care: text().notNull(),
    imageUrl: text("image_url").notNull(),
    imageAlt: text("image_alt").notNull(),
    gallery: jsonb().$type<ImageAsset[]>().notNull().default([]),
    /** Stopgap until product variants exist; null for one-size items. */
    sizes: jsonb().$type<ProductSize[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("products_category_id_idx").on(t.categoryId),
    check("products_price_non_negative", sql`${t.priceCents} >= 0`),
  ],
);

export const productStock = pgTable(
  "product_stock",
  {
    productId: integer("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer().notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [check("product_stock_quantity_non_negative", sql`${t.quantity} >= 0`)],
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  stock: one(productStock, { fields: [products.id], references: [productStock.productId] }),
}));

export const productStockRelations = relations(productStock, ({ one }) => ({
  product: one(products, { fields: [productStock.productId], references: [products.id] }),
}));
