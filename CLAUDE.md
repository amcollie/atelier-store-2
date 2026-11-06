# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm dev | build | lint | typecheck
pnpm db:generate && pnpm db:migrate   # schema changes: always a committed migration in drizzle/
pnpm db:seed                          # insert-only: fills an empty database, never overwrites
pnpm auth:generate                    # regenerate src/db/auth-schema.ts (Better Auth CLI, pinned)
pnpm auth:make-admin <email>          # promote an existing user to admin
```

Use pnpm only (see Drizzle Studio). There is no test runner yet; verify changes against the running app and the Stripe sandbox.

## Next.js 16 with Cache Components

- `cacheComponents` and `partialPrefetching` are on. Read `node_modules/next/dist/docs/` before writing data-fetching or caching code.
- Anything that reads the request (cookies, session, uncached DB reads) must render inside `<Suspense>`, never in `'use cache'`; otherwise prerendering breaks.
- After catalogue writes: `updateTag("catalog")` in server actions, `revalidateTag("catalog", { expire: 0 })` elsewhere. `"max"` serves one stale view first.
- An unknown product slug renders `not-found.tsx` with HTTP 200 plus `noindex` (documented Next 16 behaviour; `dynamicParams` is unavailable). The same applies to admin pages a non-admin requests.
- Admin pages export `instant = false`, because they deliberately block on the role check.
- `next build` reads product slugs from the database, so the database must be reachable at build time.

## Design system

- Tokens and primitives live only in `src/app/globals.css` (no `tailwind.config`, no PostCSS config). Use the semantic utilities and component classes defined there, not raw colours or Tailwind's default palette. Corners are square everywhere.
- Keep client components to the minimum; the existing ones are small islands (forms, header, bag lines).
- Marketing content in `src/lib/sample-data.ts` is placeholder. Every link must lead to a route that exists: categories are `/collections/{top}` and `/collections/{top}/{sub}`. There are no search, contact, service, story, help or legal pages, so nothing links to them.
- Product photos must not show third-party logos.

## Data model decisions

- **Migrations:** `db:generate` + `db:migrate`, committed. Never `db:push` for real schema changes. Every other environment needs `pnpm db:migrate` before new code runs there.
- **Tables:** one file per area under `src/db/`, re-exported from `src/db/schema.ts`, the single schema entry point for Drizzle, drizzle-kit and Better Auth. Integer identity keys, snake_case columns with camelCase TS keys, `timestamptz`. `src/db/auth-schema.ts` is generated: never hand-edit it (text ids, plain `timestamp` in UTC).
- **Scope:** products, categories, stock, orders, plus auth. Don't add refunds, tax, discounts, reviews, wishlists, variants, stock history or category management unless asked. `products.sizes` and `gallery` are jsonb stopgaps until variants exist.
- **Categories:** two levels. The tops are Women, Men and Unisex; a product belongs to exactly one sub-category (anything ambiguous goes under Unisex). SQL can't enforce this, so the seed, `toProduct` and the admin actions do.
- **Money:** integer cents everywhere. `formatPrice` never rounds, because the shown price must equal what Stripe charges. Product prices are $0.50 to $1,000,000; Stripe Checkout rejects a USD total under $0.50.
- **Dates:** formatted in the store's time zone (`America/New_York`) via `src/lib/format.ts`, not the server's.
- **Stock:** one `product_stock.quantity` per product, shared by all sizes. It is the *available* number: open checkouts have already subtracted their hold. Held units are computed from pending orders, never stored. `in_stock | low_stock | out_of_stock` is derived (low at 5 or fewer), never stored, and shared by store and admin.
- **No transactions:** neon-http has no interactive transactions. Anything that must be atomic is one SQL statement (CTEs), with CHECK constraints and unique indexes as the safety net: `product_stock >= 0` stops oversell, `orders_one_open_checkout_per_user` stops one shopper holding stock twice.
- **Seed:** insert-only by natural key. Once a database is live, `/admin` is the source of truth for products.
- **Drizzle Studio:** its SQL endpoint is unauthenticated with wildcard CORS. `patches/drizzle-kit@0.31.11.patch` limits it to `https://local.drizzle.studio`; npm would skip the patch. Redo the patch when upgrading drizzle-kit, and drop it once upstream fixes the issue. Studio uses `STUDIO_DATABASE_URL` (a dev branch or limited role), never production.

## Cart

- An httpOnly cookie of `{ slug, size, qty }` references only, per device, not per account. `src/lib/cart.ts` is the only code that touches it.
- The client sends only slug, size and quantity. Prices, totals and stock always come from the database, uncached.
- The bag reserves nothing. Stock is held from checkout start. The bag counts the signed-in shopper's own open-checkout hold as available to them, so going Back from Stripe never shows their items as sold out.
- Rendering can't set cookies, so a clamped quantity is saved by the next cart action.

## Orders and Stripe Checkout

Hosted Stripe Checkout, USD and US shipping only, complimentary shipping, no tax (Stripe Tax needs a registration).

- **Only `src/lib/orders.ts` writes orders.** `public_id` (random) goes in URLs, never `id`. Order lines snapshot name, size and price; catalogue edits never change past orders.
- **Two states kept consistent by CHECK constraints:** `status` (pending holds stock, paid, canceled has returned it) and `payment_status` (what Stripe reports). Every change is a conditional update, so replays and out-of-order events change nothing.
- **Never trust the client:** line items come from `order_items`. Only Stripe's data settles an order (a verified webhook event or a server-side session retrieve). An order is marked paid only when Stripe's amount and currency equal the order's. The bag's shown subtotal is sent only to detect a price change, never charged.
- **Invariants from fixed bugs:**
  - Never redirect a shopper to a session whose order is no longer pending; expire it instead.
  - A shopper's checkout start skips their own session-less order younger than two minutes, because another tab is creating it.
  - Never report a checkout as canceled while its session can still be paid.
- **Review flags:** money Stripe took that can't settle the order (`paid_after_cancel`, `amount_mismatch`) is flagged on the order, shown on the read-only `/admin/orders`, and resolved by a person in the Stripe Dashboard. Flagged orders are skipped by automation and never block the shopper's next checkout.
- **Delayed payments:** complete-but-unpaid becomes `processing` with the hold kept, and the async webhooks settle it. Only a delayed payment ends as `failed`; a declined card stays on Stripe's page.
- **Bag after payment:** the return route removes only the order's lines. A shopper who pays and never returns keeps them in the bag (the webhook can't reach the cookie). No customer emails exist.
- **Backstop:** `reconcileStaleOrders` runs in `after()` on checkout start, throttled, for missed webhooks (lapsed holds, `processing` older than a day).
- **Stripe client:** created lazily (builds need no keys), refuses live keys outside production, API version pinned to the SDK's. Redirect URLs come from `BETTER_AUTH_URL`, never the Host header.
- **Local webhooks:** `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook`. Its `whsec_…` must equal `STRIPE_WEBHOOK_SECRET`.

## Authentication and authorization

- **Scope:** email and password, 30-day database sessions, an `admin` role. Don't add social login, password reset, 2FA, email verification or other account features unless asked.
- **Config (`src/lib/auth.ts`):** no cookie cache, so role changes and bans apply on the next request. `nextCookies()` stays the last plugin. The file has no `server-only` import, because the Better Auth CLI loads it. Rate limits are stored in Postgres; behind a proxy, set `advanced.ipAddress`.
- **Sign-in and sign-up go through the `/api/auth` HTTP endpoints** (`authClient`), never server actions: `auth.api.*` calls skip the rate limits.
- **Session reads** only through `src/lib/session.ts`. Pages and actions check for themselves; `src/proxy.ts` only looks for a session cookie and is not a security boundary.
- **Redirect targets** always go through `safeCallbackURL`, which parses the value the way a browser does.
- **Admin is checked at every layer:** layout and page (`requireAdmin` via `AdminPage`; never fetch outside it), every action through `adminAction()` (actions are public POST endpoints), and every `src/lib/admin/*` function through `assertAdmin()`. Non-admins get a 404, so admin pages carry no identifying title. Add a section to `src/lib/admin/sections.ts` only once its page exists.
- **Customer data:** order reads are always scoped by the session's user id, so another customer's order looks the same as a missing one. Admins can't open a customer's order page either; they use `/admin/orders`.

## Admin forms

- zod schemas in `src/lib/admin/schemas.ts` are shared by the client form (instant feedback) and the action, which always parses again. Numbers are digits only: `z.coerce.number()` accepts "" as 0 and "1e3".
- Forms submit from `onSubmit` inside `startTransition`, not `<form action>`, because React resets a form after its action and would wipe a rejected value.
- Stock saves are compare-and-set against the number the admin saw, because checkouts change the same column.
- A product's slug is fixed after creation (store URLs and past orders use it). Image URLs must match `src/lib/image-hosts.ts`, which also feeds `next.config.ts`.

## Environment

`.env.local` (Next reads it; `drizzle.config.ts` and the tsx scripts load it explicitly). `src/db/index.ts` throws at import time without `DATABASE_URL`, including during `next build`.

- `DATABASE_URL`: the Neon pooled connection.
- `STRIPE_SECRET_KEY`: a restricted `rk_test_…` sandbox key with write access to Checkout Sessions and read access to PaymentIntents.
- `STRIPE_WEBHOOK_SECRET`.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`.
- `STUDIO_DATABASE_URL`: only for `db:studio`.
