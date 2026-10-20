# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev             # Next.js dev server (Turbopack)
pnpm build           # production build
pnpm lint            # ESLint (flat config, eslint-config-next)
pnpm typecheck       # tsc --noEmit

pnpm db:generate     # drizzle-kit: create a migration from src/db/schema.ts into drizzle/
pnpm db:migrate      # apply migrations
pnpm db:push         # push schema directly (no migration files)
pnpm db:studio       # Drizzle Studio
pnpm db:seed         # idempotent upsert of the initial catalogue (src/db/seed-data.ts)
pnpm auth:generate   # Better Auth CLI: write auth tables to src/db/auth-schema.ts
```

There is no test runner set up yet.

## Stack and versions

Next.js 16.4 (App Router, `src/` dir), React 19, TypeScript, Tailwind CSS v4, Better Auth 1.7, Drizzle ORM with the Neon serverless HTTP driver. Path alias `@/*` → `src/*`.

`next.config.ts` enables `cacheComponents` and `partialPrefetching`, which change caching and rendering semantics. Read the bundled docs in `node_modules/next/dist/docs/` before writing data-fetching or caching code. Tailwind is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` (no PostCSS config); styles enter via `@import "tailwindcss"` in `src/app/globals.css`.

## Design system

All tokens and primitives live in `src/app/globals.css`; there is no `tailwind.config`. Colours are runtime CSS variables on `:root`, mapped into Tailwind via `@theme inline`, so `.theme-inverse` re-scopes a subtree (footer, dark bands) by swapping the variables. Use semantic utilities (`bg-paper`, `text-ink`, `text-muted`, `border-line`, `text-caption`, `heading-*`, `eyebrow`, `container-page`, `grid-products`, `media-frame`) rather than raw colours or Tailwind's default palette. Buttons/links/fields are component classes (`btn btn-primary`, `link`, `field`). Corners are square everywhere. Breakpoints: `md` 768, `lg` 1024, `xl` 1440.

Products come from Postgres through `src/lib/catalog.ts` (see Database conventions below). Marketing content (navigation, hero, collections, editorial, services) is still placeholder data in `src/lib/sample-data.ts`. Unsplash images are allowed via `images.remotePatterns` in `next.config.ts`; gallery "detail" shots are focal-point crops of the same photo. The announcement bar, `SiteHeader` and `SiteFooter` are rendered once in `src/app/layout.tsx`; each page supplies its own `<main id="main" className="flex-1">`. Client components are kept to `SiteHeader`, `NewsletterForm` and `ProductPurchase`. Sample photos were checked for visible third-party logos; keep it that way when swapping images.

With Cache Components on, product slugs come from `generateStaticParams`; an unknown slug renders `not-found.tsx` with a 200 status plus `noindex` (documented Next 16 behaviour; `dynamicParams` is unavailable).

## Database conventions

- **Migrations:** change the schema with `db:generate` + `db:migrate` and commit the SQL in `drizzle/`. Don't use `db:push` for real schema changes.
- **Table definitions:** tables live in their own file under `src/db/` (catalogue: `catalog-schema.ts`) and are re-exported from `schema.ts`. Use integer identity primary keys, snake_case column names with camelCase TS keys, and `timestamptz` timestamps.
- **Scope:** v1 has only products, categories and stock. Don't add carts, orders, payments, reviews, wishlists or product variants unless asked. Until variants exist, `products.sizes` (jsonb) is a stopgap and the gallery is a jsonb column, not a separate images table.
- **Category tree:**
  - It is two levels deep. The top categories are Women, Men and Unisex (`parent_id` null); every other category is a sub-category of one of them.
  - A product belongs to exactly one **sub-category**, never a top category. Items that fit both or neither go under Unisex.
  - Slugs are unique per parent, so the same name can repeat under different tops. URLs look like `/collections/{top}/{sub}`.
  - SQL can't enforce the depth limit or the sub-category-only rule, so the seed and `toProduct` in `src/lib/catalog.ts` do.
- **Money and stock:**
  - Prices are integer cents.
  - Stock is a quantity in `product_stock`, one row per product. The `in_stock | low_stock | out_of_stock` status is derived in code (low at 5 or fewer) and never stored.
- **Reads:** all catalogue reads go through `src/lib/catalog.ts` (`server-only`), as `'use cache'` functions with `cacheTag("catalog")`. After writing catalogue data, call `updateTag`/`revalidateTag("catalog")`. An uncached database read outside `<Suspense>` breaks prerendering.
- **Types:** shared shapes live in `src/lib/catalog-types.ts`, and client components import types from there.
- **Seed:** `src/db/seed.ts` must stay idempotent, upserting by natural keys. When the catalogue structure changes, update `src/db/seed-data.ts` to match.
- **Build:** `next build` reads product slugs from the database, so the database must be reachable at build time.

## Architecture

The request path for auth is: `authClient` (`src/lib/auth-client.ts`, browser) → `src/app/api/auth/[...all]/route.ts` (catch-all, delegates to `toNextJsHandler`) → `auth` (`src/lib/auth.ts`, server only) → `db` (`src/db/index.ts`) → Neon Postgres.

- `src/db/schema.ts` is the single schema entry point. Both the Drizzle client (`src/db/index.ts`) and the Better Auth Drizzle adapter (`src/lib/auth.ts`) import `* as schema` from it, and `drizzle.config.ts` points drizzle-kit at it. New table files must be re-exported from here to be seen by any of them.
- The Better Auth tables (`user`, `session`, `account`, `verification`) are not yet generated. Until `npm run auth:generate` is run and `src/db/auth-schema.ts` is re-exported from `schema.ts` and pushed/migrated, the build warns about missing tables and auth requests fail. Regenerate after adding Better Auth plugins that need tables.
- In `src/lib/auth.ts`, the `nextCookies()` plugin must stay last in `plugins` so server actions can set cookies.
- `src/db/index.ts` throws at import time if `DATABASE_URL` is unset, so any module that imports `db` or `auth` (including the auth route during `next build`) needs it defined.

## Environment

Copy `.env.example` to `.env.local`. `drizzle.config.ts` loads `.env.local` explicitly via dotenv; the app gets it from Next.js. Variables: `DATABASE_URL` (Neon pooled connection string), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (used by the auth client). `.gitignore` ignores `.env*` except `.env.example`.
