import type { Metadata } from "next";

import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return <AuthPage mode="sign-in" searchParams={searchParams} />;
}
