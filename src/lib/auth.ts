import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins/admin";

import { db } from "@/db";
import * as schema from "@/db/schema";

// BETTER_AUTH_SECRET and BETTER_AUTH_URL come from the environment.
export const auth = betterAuth({
  appName: "Atelier",
  database: drizzleAdapter(db, { provider: "pg", schema }),
  // Signs the user in straight after sign-up (autoSignIn defaults to true).
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  // Database sessions, no cookie cache: role changes and bans apply on the next request.
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // slide the expiry at most once a day
  },
  // In-memory counters are per instance, so keep them in Postgres.
  rateLimit: { storage: "database" },
  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    // nextCookies must stay last so it can set cookies from server actions.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
