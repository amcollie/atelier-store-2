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

/** Only same-site paths: rejects absolute URLs, `//host` and `/\host` so callbackURL can't redirect off-site. */
export function safeCallbackURL(value: unknown, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return value;
}
