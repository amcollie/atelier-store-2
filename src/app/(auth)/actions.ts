"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { safeCallbackURL } from "@/lib/session";

export type AuthFormState = {
  error?: string;
  values?: { name?: string; email?: string };
};

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) {
      // Same message for unknown email and wrong password, so accounts can't be enumerated.
      return { error: "Invalid email or password.", values: { email } };
    }
    throw error;
  }

  redirect(safeCallbackURL(formData.get("callbackURL")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const values = { name, email };

  if (!name) return { error: "Please enter your name.", values };
  if (password.length < 8) return { error: "Use a password of at least 8 characters.", values };

  try {
    // Only these fields are passed: the admin plugin's role field is server-only anyway.
    await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) {
      const exists = /exist/i.test(error.message);
      return {
        error: exists ? "An account with this email already exists." : "We couldn't create your account. Please check your details.",
        values,
      };
    }
    throw error;
  }

  redirect(safeCallbackURL(formData.get("callbackURL")));
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
