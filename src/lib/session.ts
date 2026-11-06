import "server-only";

import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

// Data access layer for the session: the only place that reads it. Reads the
// request, so callers must render inside <Suspense> (Cache Components).

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

/** The signed-in user, verified against the database (one lookup per request), or null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email, role, createdAt } = session.user;
  return { id, name, email, role: role ?? "user", createdAt };
});

/** For customer pages and server actions: redirects to sign-in when signed out. */
export async function requireUser(returnTo = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?callbackURL=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For admin pages: signed-out users go to sign-in; non-admins get a 404 so /admin isn't advertised. */
export async function requireAdmin(returnTo = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") notFound();
  return user;
}

/**
 * For admin server actions. Actions are public POST endpoints that anyone can
 * call directly, so each one checks the role itself; this returns the admin, or
 * null for signed-out users and non-admins (no redirect or 404 from an action).
 */
export async function getAdminForAction(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : null;
}

export class AdminAccessError extends Error {
  constructor() {
    super("Admin access required.");
    this.name = "AdminAccessError";
  }
}

/**
 * For the admin data layer (src/lib/admin/*): a second check under pages and
 * actions, so a caller that forgets its own check still can't read or write.
 * getCurrentUser is cached per request, so repeating the check is free.
 */
export async function assertAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user?.role !== "admin") throw new AdminAccessError();
  return user;
}

/**
 * Only same-site paths, so callbackURL can't redirect off-site. Parses the
 * value the way a browser does, because browsers drop tabs and newlines and
 * read `\` as `/`: "/\t/evil.example" is really "//evil.example". Returns the
 * parsed path, never the raw input.
 */
export function safeCallbackURL(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  const base = "http://same-site.invalid";
  let url: URL;
  try {
    url = new URL(value, base);
  } catch {
    return fallback;
  }
  return url.origin === base ? url.pathname + url.search + url.hash : fallback;
}
