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

Products come from Postgres through `src/lib/catalog.ts` (see Database conventions below). Marketing content (navigation, hero, collections, editorial, services) is still placeholder data in `src/lib/sample-data.ts`. Unsplash images are allowed via `images.remotePatterns` in `next.config.ts`; gallery "detail" shots are focal-point crops of the same photo. The announcement bar, `SiteHeader` and `SiteFooter` are rendered once in `src/app/layout.tsx`; each page supplies its own `<main id="main" className="flex-1">`. Client components are kept to `SiteHeader`, `NewsletterForm`, `ProductPurchase`, `AuthForm`, `BagLines` (whose quantity buttons use `aria-disabled`, not `disabled`, so keyboard focus survives a save or the stock limit), `CheckoutButton`, `AwaitingConfirmation` (polls the order page with `router.refresh()` while payment is unconfirmed), `AdminNav` (marks the current admin section from the URL), and the admin `ProductForm` and `StockForm`. `SiteHeader` takes the bag link as a server-rendered `bag` slot (`CartBagLink` in `<Suspense>`), because the count reads the cart cookie. Sample photos were checked for visible third-party logos; keep it that way when swapping images.

With Cache Components on, product slugs come from `generateStaticParams`; an unknown slug renders `not-found.tsx` with a 200 status plus `noindex` (documented Next 16 behaviour; `dynamicParams` is unavailable).

## Database conventions

- **Migrations:** change the schema with `db:generate` + `db:migrate` and commit the SQL in `drizzle/`. Don't use `db:push` for real schema changes.
- **Table definitions:** tables live in their own file under `src/db/` (catalogue: `catalog-schema.ts`) and are re-exported from `schema.ts`. Use integer identity primary keys, snake_case column names with camelCase TS keys, and `timestamptz` timestamps.
- **Scope:** the v1 catalogue has only products, categories and stock (plus the generated auth tables and the order tables; see Authentication and Orders). The cart lives in a cookie, not a table (see Cart). Orders and Stripe Checkout exist (see Orders and Checkout). Don't add refunds, tax, discounts, reviews, wishlists or product variants unless asked. Until variants exist, `products.sizes` (jsonb) is a stopgap and the gallery is a jsonb column, not a separate images table.
- **Category tree:**
  - It is two levels deep. The top categories are Women, Men and Unisex (`parent_id` null); every other category is a sub-category of one of them.
  - A product belongs to exactly one **sub-category**, never a top category. Items that fit both or neither go under Unisex.
  - Slugs are unique per parent, so the same name can repeat under different tops. URLs look like `/collections/{top}/{sub}`.
  - SQL can't enforce the depth limit or the sub-category-only rule, so the seed and `toProduct` in `src/lib/catalog.ts` do.
- **Money and stock:**
  - Prices are integer cents. `formatPrice` shows whole dollars as "$480" and anything else with cents ("$1,250.50"); it never rounds, because the shown price must equal what Stripe charges.
  - Stock is a quantity in `product_stock`, one row per product. The `in_stock | low_stock | out_of_stock` status is derived in code (`toStock` in `src/lib/catalog.ts`: low at 5 or fewer, sold out at 0 or when every size is switched off) and never stored. `StockStatus` shows it on the product page ("Only N left" when low); product cards show a Sold out badge, or the compact low line.
- **Reads:** all public catalogue reads go through `src/lib/catalog.ts` (`server-only`), as `'use cache'` functions with `cacheTag("catalog")`. Admin reads live in `src/lib/admin/` and are uncached, so admins always see current data. After writing catalogue data, call `updateTag("catalog")` (in server actions) or `revalidateTag("catalog", { expire: 0 })` (elsewhere, so the next visitor gets fresh data instead of a stale page). An uncached database read outside `<Suspense>` breaks prerendering.
- **Types:** shared shapes live in `src/lib/catalog-types.ts`, and client components import types from there.
- **Seed:** `src/db/seed.ts` is idempotent and insert-only (`onConflictDoNothing` by natural key). It fills an empty database and never overwrites what admins changed. Once a database is live, `/admin` is the source of truth for products, and `seed-data.ts` only describes a fresh install.
- **Build:** `next build` reads product slugs from the database, so the database must be reachable at build time.
- **Drizzle Studio:**
  - Studio exposes an unauthenticated SQL endpoint with wildcard CORS (CWE-942), and no release fixes it yet.
  - `patches/drizzle-kit@0.31.11.patch` (registered in `pnpm-workspace.yaml`) limits it to the `https://local.drizzle.studio` origin.
  - Use pnpm only; npm would install drizzle-kit without the patch. When upgrading drizzle-kit, redo the patch, and drop it once upstream fixes the issue.

## Cart

- **Storage:** an httpOnly `atelier_cart` cookie of `{ slug, size, qty }` references, capped at 20 lines and 99 per line. It never holds prices, names or stock, and it isn't tied to the account: it's per device and survives sign-in and sign-out.
- **One module:** `src/lib/cart.ts` (`server-only`) is the only code that reads or writes the cookie. `getCart()` loads current price and stock with an uncached Drizzle query, never the cached catalogue reads, so call it inside `<Suspense>` or a server action. Shared types are in `src/lib/cart-types.ts`.
- **Prices:** the client sends only slug, size and quantity. Prices, line totals and the subtotal (integer cents) are always computed on the server from the database.
- **Stock:** `product_stock` is per product, so all sizes of one product share it. `resolveCart()` fills lines in cart order and clamps them to live stock; each line gets an `issue` (`reduced`, `sold_out`, `size_unavailable`, `held_elsewhere`), and a line with `qty` 0 is left out of the subtotal but kept in the bag so the shopper can see and remove it. Rendering can't set cookies, so a clamped quantity is saved by the next cart action.
- **Mutations:** `addToCart`, `updateQuantity` and `removeFromCart` in `src/app/bag/actions.ts`. Each re-reads the cookie, validates its input and re-checks stock before writing. Setting the cookie re-renders the route, which updates `/bag` and the header count.
- **Stock holds:** the bag itself reserves nothing. Stock is held only from checkout start (see Checkout). The bag page and bag actions load stock with `loadBagProducts`, which adds back units held by the signed-in shopper's own open (pending, unpaid) checkout, so returning from Stripe with Back doesn't show their own items as sold out or lower their quantity. Other shoppers' holds still count as taken. `createPendingOrder` uses plain `loadLiveProducts`, because it runs after that hold is released.

## Orders

Tables in `src/db/order-schema.ts` (migration `drizzle/0002_orders.sql`). Only `src/lib/orders.ts` (`server-only`) writes them.

- **`orders`:**
  - Every order belongs to a signed-in user (`user_id` → `user.id`, `ON DELETE restrict`, so a user with orders can't be deleted).
  - `public_id` is the random id to use in URLs, never `id`.
  - Money is integer cents, and `total_cents = subtotal_cents + shipping_cents` is enforced.
- **Two explicit states, kept consistent by CHECK constraints:**
  - `status` (`order_status`: `pending` holds stock, `paid`, `canceled` has returned it).
  - `payment_status` (`payment_status`: `unpaid`, `processing`, `paid`, `failed`, `expired`, `canceled`), which mirrors what Stripe reports.
  - `paid_at` is set exactly when the order is paid, and `canceled_at` exactly when it's canceled.
  - Moving past `unpaid` requires a Checkout Session id.
- **Stripe ids:** `stripe_checkout_session_id` (`cs_…`) and `stripe_payment_intent_id` (`pi_…`) are unique, nullable columns with a format check.
- **`order_items`:**
  - Snapshots the product slug, name, size and unit price at checkout. Catalogue edits never change past orders.
  - `line_total_cents = unit_price_cents * quantity`, with one line per product and size.
  - Items cascade with their order; products with order lines can't be deleted (restrict).
- **`stripe_events`:** processed webhook event ids (`evt_…`) for deduplication. Insert with `ON CONFLICT DO NOTHING`. `order_id` is set to null if the order is deleted.
- **Writes:** neon-http has no interactive transactions, so status changes and stock moves are each one statement.
  - `createPendingOrder` inserts the order and its items and holds the stock in one CTE. `product_stock`'s `>= 0` check aborts it on oversell, which keeps concurrent buyers safe.
  - `releaseOrder` cancels a pending order and restocks in one CTE guarded by `status = 'pending'`, so replays release nothing.
  - The partial unique index `orders_one_open_checkout_per_user` (migration `0003`) allows one pending, unpaid order per user. Two checkouts started together can't both hold stock: the second insert fails and `createPendingOrder` returns `in_progress`.
  - Stock changes call `refreshStockPages()` (`revalidateTag("catalog", { expire: 0 })`), so the first product-page view after a hold or release already shows the new availability. `"max"` would serve one stale view first.

## Checkout

Stripe Checkout (hosted), USD and US shipping only, with no tax (Stripe Tax needs a registration) and complimentary shipping.

- **Flow:**
  - `CheckoutButton` calls `startCheckout` in `src/app/checkout/actions.ts`, which:
    - requires a signed-in user;
    - settles stale holds and the shopper's earlier unpaid checkouts;
    - runs `createPendingOrder`, which re-resolves the bag cookie against live prices and stock. Any reduced or unavailable line returns `changed`, the corrected bag is saved, and the shopper is redirected to `/bag?checkout=changed` (or `?checkout=unavailable` when someone else took the last one) to review it. `/bag` shows one notice per `checkout` value, including `canceled`.
  - `releaseUserPendingOrders` skips an order with no session that is younger than two minutes, because another tab is still creating its session; the new checkout then gets `in_progress` ("already opening in another window").
  - It then creates the Checkout Session with `price_data` built from the order's database prices and redirects to Stripe.
  - `attachCheckoutSession` returns false if the order was released meanwhile. The action then expires that session and shows an error instead of redirecting, so a shopper is never sent to pay for a canceled order.
  - If session creation fails, the hold is released.
  - Sessions last 31 minutes, which is the stock hold.
- **Prices:** never accept prices, totals or payment status from the client. Line items come from `order_items`. An order is marked paid only when Stripe's `amount_total` and `currency` equal the order's.
- **Only Stripe's data settles an order:** `syncOrderFromSession` in `src/lib/orders.ts` is shared by the webhook and the return routes, and is given a session from a verified event or `stripe.checkout.sessions.retrieve`.
  - It's idempotent: each change is a conditional update.

  | Session state | Result |
  |---|---|
  | complete, paid | paid |
  | complete, unpaid | processing, hold kept |
  | `async_payment_failed` | canceled/failed, restocked |
  | expired | canceled/expired, or canceled/canceled when the shopper backed out; restocked |

- **Routes:**
  - `/api/stripe/webhook` verifies the signature with `Stripe.webhooks.constructEvent` on the raw body and skips event ids already in `stripe_events`. It handles `checkout.session.completed`, `async_payment_succeeded`, `async_payment_failed` and `expired`, and returns 500 on errors so Stripe retries.
  - `/checkout/complete` (the `success_url`) retrieves the session server-side, syncs it, clears the bag if the session completed, and redirects to `/checkout/orders/[publicId]`. Reaching it alone never marks an order paid.
  - `/checkout/cancel` (the `cancel_url`) expires the session, restocks, and returns to `/bag?checkout=canceled`.
  - `/checkout/orders/[publicId]` is the order detail page for both checkout returns and order history. `getOrderView(publicId, user.id)` matches on both columns, so another customer's order and a missing one give the same `notFound()`. It shows the snapshot lines (quantity, unit and line price), totals, `PaymentStatusLabel` (`src/components/payment-status.tsx`, shared with the history list), dates and shipping. Item photos are the product's current image, the only non-snapshot field.
- **Backstop:** `reconcileStaleOrders` (run on each checkout start) asks Stripe about unpaid orders whose hold lapsed, in case an expiry webhook was missed.
- **Stripe client:** `getStripe()` in `src/lib/stripe.ts` is created lazily, so builds need no keys, and refuses live keys outside production. Redirect URLs come from `appUrl()` (`BETTER_AUTH_URL`), never the Host header. The API version is pinned to the SDK's.
- **Local testing:** `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook` prints the `whsec_…` to use as `STRIPE_WEBHOOK_SECRET` (current CLI versions require `--events`).

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
  - Pages and server actions must call them themselves. `src/proxy.ts` only checks that a session cookie exists on `/account`, `/admin` and `/checkout/orders`, and is not a security boundary.
- **Account area:** each `/account/*` page renders `AccountShell` (`src/components/account-shell.tsx`) with its own `current` section, then calls `requireUser()` inside `<Suspense>`. The pages are an Overview, Orders and read-only Account details. To add a page, add it to `sections` in the shell.
- **Order history:** `/account/orders` lists the signed-in customer's orders through `listOrdersForUser(user.id)` in `src/lib/orders.ts`, newest first (50 at most, no pagination yet), always scoped by the session's user id. Abandoned checkouts (`payment_status` canceled or expired) are left out. Each row links to `/checkout/orders/[publicId]`, which checks ownership again. Status wording lives in `PAYMENT_STATUS_DISPLAY` in `src/lib/order-types.ts`.
- **Admin area (`/admin/**`):** admin-only. Signed-out visitors go to sign-in, and signed-in non-admins get a 404, so admin pages carry no identifying title (the layout sets `noindex` only). Sections: Overview, Products, Categories, Stock, Orders (`src/lib/admin/sections.ts`). Hiding links is never the protection; the role is checked server-side at every layer:
  - **Layout:** `src/app/admin/layout.tsx` calls `requireAdmin()` inside `<Suspense>` before rendering the shell and `AdminNav`, so non-admins never receive them. Layouts don't re-render on client navigation, so this check alone isn't enough.
  - **Pages:** each page wraps its content in `AdminPage` (`src/components/admin/admin-page.tsx`), which calls `requireAdmin(path)` again before rendering `children`. Never fetch data in the page component itself, outside `AdminPage`. Each page exports `instant = false`, because it deliberately blocks on the role check (otherwise dev validation reports the redirect/404 as an error).
  - **Server actions:** wrap every admin action in `adminAction()` (`src/lib/admin/action.ts`). It calls `getAdminForAction()` on each call and returns `{ status: "error", message: "Not allowed." }` before the handler runs. Actions are public POST endpoints, so this is the real boundary for writes. Shared state types are in `src/lib/admin/action-types.ts`.
  - **Data layer:** every function in `src/lib/admin/*` (`server-only`) starts with `assertAdmin()`, which throws `AdminAccessError`, so a caller that forgets its own check still can't read or write.
  - A role change applies on the next request (no session cookie cache). The plugin's `/api/auth/admin/*` endpoints check the role themselves.
- **Admin products (`/admin/products`, `/new`, `/[id]/edit`):** list with a sub-category filter (a plain GET form), create, edit and stock.
  - **Validation:** zod schemas in `src/lib/admin/schemas.ts` (no `server-only`), shared by `ProductForm` (instant feedback) and the actions in `src/app/admin/products/actions.ts`, which always parse again with `parseWith`. Prices are entered in dollars and become integer cents without floats. Image URLs must match `ALLOWED_IMAGE_PATTERNS` in `src/lib/image-hosts.ts`, which `next.config.ts` also uses for `remotePatterns`.
  - **Database rules (`src/lib/admin/catalog.ts`):** the category must be a sub-category, re-checked on the server. Unique slug and style code violations become field errors. `createProduct` inserts the product and its `product_stock` row in one statement (an insert CTE).
  - **Slug:** fixed after creation, because store URLs and past orders' links use it.
  - **Availability:** per-size `available` flags (stored in `products.sizes`) and the available quantity. Stock is shared by all sizes.
  - **Stock saves:** `setStock(productId, expected, quantity)` writes only if stock still equals what the admin saw, because checkouts hold stock by decrementing the same number. A conflict returns the current value. The edit page shows units held by pending orders.
  - **`ProductForm` and `StockForm`:** submit from `onSubmit` inside `startTransition`, not `<form action>`, because React resets a form after its action finishes and would wipe the admin's input after a rejected field.
- **Admin stock (`/admin/stock`):** every product with **available** (`product_stock.quantity`, the only stock number; admins set it), **held** (units in pending orders, already subtracted from available) and **on hand** (available + held), filterable by sub-category and "low or sold out".
  - `listStock()` in `src/lib/admin/catalog.ts` gets held units for all products in one grouped query (`heldByProduct`); don't query per row.
  - Each row is a compact `StockForm` posting to `setStockAction` in `src/app/admin/stock/actions.ts` (shared with the product edit page). The same compare-and-set applies; after a conflict the form adopts the server's number, and a newer render only re-seeds a row the admin hasn't edited.
  - Stock numbers are digits only (`wholeNumber` in `schemas.ts`); `z.coerce.number()` would accept "" as 0 and "1e3".
  - Saves call `updateTag("catalog")` for product and collection pages; the bag and checkout read stock live, and `product_stock`'s `>= 0` check still stops oversell.
  - `LOW_STOCK_THRESHOLD` and `stockTone` live in `src/lib/admin/stock-tone.ts`, shared by the store and admin, so "low" means the same everywhere. There's no stock history or audit log.
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

Copy `.env.example` to `.env.local`. `drizzle.config.ts` loads `.env.local` explicitly via dotenv; the app gets it from Next.js. Variables: `DATABASE_URL` (Neon pooled connection string), `STRIPE_SECRET_KEY` (a restricted `rk_test_…` key from a Stripe sandbox, with write access to Checkout Sessions), `STRIPE_WEBHOOK_SECRET` (the endpoint's `whsec_…`), `STUDIO_DATABASE_URL` (used only by `db:studio`; a Neon dev branch or limited role, never production, and Studio refuses to start without it), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` (used by the auth client). `.gitignore` ignores `.env*` except `.env.example`.
