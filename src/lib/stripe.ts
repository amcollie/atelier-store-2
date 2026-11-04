import "server-only";

import Stripe from "stripe";

// Stripe client for server code only. Created on first use, not at import, so
// `next build` works without Stripe keys. Use a restricted key (rk_…) from a
// Stripe sandbox for development.

let client: Stripe | undefined;

export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add a restricted test key (rk_test_…) to .env.local.");
  }
  if (process.env.NODE_ENV !== "production" && /^[rs]k_live_/.test(key)) {
    throw new Error("Refusing to use a live Stripe key outside production. Use a sandbox test key.");
  }
  client = new Stripe(key, {
    apiVersion: "2026-10-28.endive",
    appInfo: { name: "Atelier" },
  });
  return client;
}

/**
 * Absolute URL on this site for Stripe redirects. Built from the configured
 * origin (BETTER_AUTH_URL), never from the request's Host header.
 */
export function appUrl(path: string): string {
  const base = process.env.BETTER_AUTH_URL;
  if (!base) throw new Error("BETTER_AUTH_URL is not set.");
  return new URL(path, base).toString();
}

/** Tags our Checkout Sessions in the Stripe Dashboard. */
export const CHECKOUT_INTEGRATION_ID = "atelier-checkout-qhzmtwkr";
