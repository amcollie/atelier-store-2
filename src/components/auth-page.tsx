import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth-form";
import { getCurrentUser, safeCallbackURL } from "@/lib/session";

type Mode = "sign-in" | "sign-up";

const copy = {
  "sign-in": {
    title: "Sign in",
    intro: "Sign in to your Atelier account.",
    switchPrompt: "New to Atelier?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    title: "Create an account",
    intro: "Create an account to manage your details with Atelier.",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} satisfies Record<Mode, Record<string, string>>;

/** Shared frame for /sign-in and /sign-up: static heading, request-dependent form behind Suspense. */
export function AuthPage({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { title, intro } = copy[mode];

  return (
    <main id="main" className="section container-page flex flex-1 justify-center">
      <div className="stack w-full max-w-md gap-8">
        <header className="stack gap-3">
          <p className="eyebrow text-muted">Account</p>
          <h1 className="heading-display">{title}</h1>
          <p className="text-muted">{intro}</p>
        </header>
        <Suspense fallback={<FormFallback />}>
          <AuthFormSection mode={mode} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function AuthFormSection({ mode, searchParams }: { mode: Mode; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getCurrentUser()) redirect("/account");

  const callbackURL = safeCallbackURL((await searchParams).callbackURL);
  const { switchPrompt, switchLabel, switchHref } = copy[mode];
  const query = callbackURL === "/account" ? "" : `?callbackURL=${encodeURIComponent(callbackURL)}`;

  return (
    <>
      <AuthForm mode={mode} callbackURL={callbackURL} />
      <p className="hairline-top pt-6 text-meta text-muted">
        {switchPrompt}{" "}
        <Link href={`${switchHref}${query}`} className="link text-ink">
          {switchLabel}
        </Link>
      </p>
    </>
  );
}

function FormFallback(): ReactNode {
  return (
    <div className="stack gap-6" aria-busy="true">
      <div className="h-[4.5rem] bg-surface" />
      <div className="h-[4.5rem] bg-surface" />
      <div className="btn btn-block bg-surface" />
    </div>
  );
}
