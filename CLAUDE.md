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
pnpm auth:generate   # Better Auth CLI (pinned to the installed version): regenerate src/db/auth-schema.ts
pnpm auth:make-admin <email>  # promote an existing user to the admin role
```

There is no test runner set up yet.

## Stack and versions

Next.js 16.4 (App Router, `src/` dir), React 19, TypeScript, Tailwind CSS v4, Better Auth 1.7, Drizzle ORM with the Neon serverless HTTP driver. Path alias `@/*` → `src/*`.

`next.config.ts` enables `cacheComponents` and `partialPrefetching`, which change caching and rendering semantics. Read the bundled docs in `node_modules/next/dist/docs/` before writing data-fetching or caching code. Tailwind is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` (no PostCSS config); styles enter via `@import "tailwindcss"` in `src/app/globals.css`.

## Design system

All tokens and primitives live in `src/app/globals.css`; there is no `tailwind.config`. Colours are runtime CSS variables on `:root`, mapped into Tailwind via `@theme inline`, so `.theme-inverse` re-scopes a subtree (footer, dark bands) by swapping the variables. Use semantic utilities (`bg-paper`, `text-ink`, `text-muted`, `border-line`, `text-caption`, `heading-*`, `eyebrow`, `container-page`, `grid-products`, `media-frame`) rather than raw colours or Tailwind's default palette. Buttons/links/fields are component classes (`btn btn-primary`, `link`, `field`). Corners are square everywhere. Breakpoints: `md` 768, `lg` 1024, `xl` 1440.

Products come from Postgres through `src/lib/catalog.ts` (see Database conventions below). Marketing content (navigation, hero, collections, editorial, services) is still placeholder data in `src/lib/sample-data.ts`. Unsplash images are allowed via `images.remotePatterns` in `next.config.ts`; gallery "detail" shots are focal-point crops of the same photo. The announcement bar, `SiteHeader` and `SiteFooter` are rendered once in `src/app/layout.tsx`; each page supplies its own `<main id="main" className="flex-1">`. Client components are kept to `SiteHeader`, `NewsletterForm`, `ProductPurchase` and `AuthForm`. Sample photos were checked for visible third-party logos; keep it that way when swapping images.

With Cache Components on, product slugs come from `generateStaticParams`; an unknown slug renders `not-found.tsx` with a 200 status plus `noindex` (documented Next 16 behaviour; `dynamicParams` is unavailable).

## Database conventions

- **Migrations:** change the schema with `db:generate` + `db:migrate` and commit the SQL in `drizzle/`. Don't use `db:push` for real schema changes.
- **Table definitions:** tables live in their own file under `src/db/` (catalogue: `catalog-schema.ts`) and are re-exported from `schema.ts`. Use integer identity primary keys, snake_case column names with camelCase TS keys, and `timestamptz` timestamps.
- **Scope:** the v1 catalogue has only products, categories and stock (plus the generated auth tables; see Authentication). Don't add carts, orders, payments, reviews, wishlists or product variants unless asked. Until variants exist, `products.sizes` (jsonb) is a stopgap and the gallery is a jsonb column, not a separate images table.
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
- **Drizzle Studio:**
  - Studio exposes an unauthenticated SQL endpoint with wildcard CORS (CWE-942), and no release fixes it yet.
  - `patches/drizzle-kit@0.31.11.patch` (registered in `pnpm-workspace.yaml`) limits it to the `https://local.drizzle.studio` origin.
  - Use pnpm only; npm would install drizzle-kit without the patch. When upgrading drizzle-kit, redo the patch, and drop it once upstream fixes the issue.

## Authentication

- **Scope (v1):** email and password sign-up, sign-in and sign-out, plus 30-day database sessions; the `admin` plugin provides roles. Don't add social login, password reset, 2FA, email verification or other account features unless asked.
- **Config:** `src/lib/auth.ts`.
  - `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` come from the env.
  - Rate limits are stored in Postgres.
  - There's no cookie cache, so a role change or ban applies on the next request.
  - The plugin order is `admin()`, then `nextCookies()`, which must stay last so server actions can set cookies.
  - The file has no `server-only` import, because the Better Auth CLI has to load it.
- **Schema:** `src/db/auth-schema.ts` is generated by `pnpm auth:generate`. Never hand-edit it, and regenerate it after adding plugins, then run `db:generate` + `db:migrate`. It's an exception to the table conventions above: text ids and plain `timestamp` columns, stored as UTC. A raw SQL client in a non-UTC time zone shows these timestamps shifted; Drizzle reads them correctly.
- **Session reads:** go through `src/lib/session.ts` (`server-only`): `getCurrentUser()` (React-cached per request), `requireUser()` and `requireAdmin()`.
  - These read the request, so call them only inside `<Suspense>`, never in `'use cache'`.
  - Pages and server actions must call them themselves. `src/proxy.ts` only checks that a session cookie exists on `/account` and `/admin`, and is not a security boundary.
- **Account area:** each `/account/*` page renders `AccountShell` (`src/components/account-shell.tsx`) with its own `current` section, then calls `requireUser()` inside `<Suspense>`. The pages are an Overview and read-only Account details. To add a page, add it to `sections` in the shell. There's no order history yet.
- **Admin routes:** `/admin` is admin-only. Signed-out visitors go to sign-in, and signed-in non-admins get a 404, so admin pages carry no identifying title. The plugin's `/api/auth/admin/*` endpoints check the role themselves.
- **Forms:** `AuthForm` signs in and signs up through `authClient`, which calls the `/api/auth` HTTP endpoints.
  - Don't move these calls into server actions: Better Auth only rate-limits requests that pass through its handler, and `auth.api.*` calls skip the limits. The limits are on in production only, with 3 attempts per 10 seconds on sign-in and sign-up.
  - Sign-out stays a server action in `src/app/(auth)/actions.ts`.
  - Client validation lives in `src/lib/auth-validation.ts` and mirrors Better Auth's limits; the server still validates.
  - Pass any redirect target through `safeCallbackURL`, which allows same-site paths only.
  - Behind a proxy, set `advanced.ipAddress` so the limits apply per client IP instead of one shared bucket.

## Architecture

The request path for auth is: `AuthForm` → `authClient` (`src/lib/auth-client.ts`, browser) → `src/app/api/auth/[...all]/route.ts` (the catch-all that delegates to `toNextJsHandler`; rate limits apply here) → `auth` (`src/lib/auth.ts`) → `db` (`src/db/index.ts`) → Neon Postgres. Server code reads sessions through `src/lib/session.ts`.

- `src/db/schema.ts` is the single schema entry point. Both the Drizzle client (`src/db/index.ts`) and the Better Auth Drizzle adapter (`src/lib/auth.ts`) import `* as schema` from it, and `drizzle.config.ts` points drizzle-kit at it. New table files must be re-exported from here to be seen by any of them.
- `src/db/index.ts` throws at import time if `DATABASE_URL` is unset, so any module that imports `db` or `auth` (including the auth route during `next build`) needs it defined.

## Environment

Copy `.env.example` to `.env.local`. `drizzle.config.ts` loads `.env.local` explicitly via dotenv; the app gets it from Next.js. Variables: `DATABASE_URL` (Neon pooled connection string), `STUDIO_DATABASE_URL` (used only by `db:studio`; a Neon dev branch or limited role, never production, and Studio refuses to start without it), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (used by the auth client). `.gitignore` ignores `.env*` except `.env.example`.
