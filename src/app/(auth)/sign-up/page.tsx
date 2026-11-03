import type { Metadata } from "next";

import { AuthPage } from "@/components/auth-page";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return <AuthPage mode="sign-up" searchParams={searchParams} />;
}
