"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// Sign-in and sign-up go through the /api/auth HTTP endpoints (see AuthForm),
// because Better Auth only rate-limits requests that pass through its handler;
// calling auth.api.signInEmail from a server action would skip those limits.

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
