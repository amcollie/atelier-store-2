# Atelier Store

Next.js (App Router) eCommerce starter — TypeScript, Tailwind CSS v4, Better Auth, Drizzle ORM, and Postgres on Neon.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run auth:generate        # writes Better Auth tables to src/db/auth-schema.ts
```

Then re-export the generated tables from `src/db/schema.ts` (`export * from "./auth-schema";`) and apply them:

```bash
npm run db:push              # or db:generate + db:migrate for migration files
npm run dev
```

## Structure

| Path | Purpose |
| --- | --- |
| `src/db/index.ts` | Drizzle client over the Neon serverless HTTP driver |
| `src/db/schema.ts` | Schema entry point (empty for now) |
| `src/lib/auth.ts` | Better Auth server instance (Drizzle adapter, `nextCookies`) |
| `src/lib/auth-client.ts` | Better Auth React client |
| `src/app/api/auth/[...all]/route.ts` | Better Auth route handler |
| `drizzle.config.ts` | drizzle-kit config (reads `.env.local`) |

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:push`, `db:studio`, `auth:generate`.
