"use client";

import { useActionState } from "react";

import { type AuthFormState, signIn, signUp } from "@/app/(auth)/actions";

// Posts to server actions, so it also works before hydration / without JS.
export function AuthForm({ mode, callbackURL }: { mode: "sign-in" | "sign-up"; callbackURL: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(mode === "sign-in" ? signIn : signUp, {});
  const invalid = state.error ? true : undefined;

  return (
    <form action={action} className="stack gap-6">
      <input type="hidden" name="callbackURL" value={callbackURL} />

      {mode === "sign-up" ? (
        <label className="stack gap-1">
          <span className="eyebrow">Name</span>
          <input
            name="name"
            required
            autoComplete="name"
            defaultValue={state.values?.name}
            aria-invalid={invalid}
            aria-describedby={invalid && "auth-error"}
            className="field"
          />
        </label>
      ) : null}

      <label className="stack gap-1">
        <span className="eyebrow">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          aria-invalid={invalid}
          aria-describedby={invalid && "auth-error"}
          className="field"
        />
      </label>

      <label className="stack gap-1">
        <span className="eyebrow">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={mode === "sign-up" ? 8 : undefined}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          aria-invalid={invalid}
          aria-describedby={[invalid && "auth-error", mode === "sign-up" && "password-hint"].filter(Boolean).join(" ") || undefined}
          className="field"
        />
        {mode === "sign-up" ? (
          <span id="password-hint" className="text-meta text-muted">
            At least 8 characters.
          </span>
        ) : null}
      </label>

      {state.error ? (
        <p id="auth-error" role="alert" className="text-meta text-danger">
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
