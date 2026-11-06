"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useActionState, useEffect, useId, useRef, useState } from "react";

import { authClient } from "@/lib/auth-client";
import {
  type AuthField,
  type AuthMode,
  type AuthValues,
  type FieldErrors,
  fieldsFor,
  PASSWORD_MIN,
  validateAll,
  validateField,
} from "@/lib/auth-validation";

// Calls the Better Auth HTTP endpoints (not auth.api from a server action) so
// the built-in sign-in/sign-up rate limits apply. Until hydration React renders
// a no-op action, so the form can't fall back to a native GET submit.

type SubmitState = {
  fieldErrors?: FieldErrors;
  formError?: ReactNode;
  redirecting?: boolean;
  /** Where to move focus once the form is interactive again. */
  focus?: AuthField | "form-error";
};

type ClientError = { status?: number; code?: string; message?: string };

const labels: Record<AuthField, string> = { name: "Name", email: "Email", password: "Password" };

export function AuthForm({ mode, callbackURL }: { mode: AuthMode; callbackURL: string }) {
  const router = useRouter();
  const id = useId();
  const formErrorRef = useRef<HTMLParagraphElement>(null);
  const inputRefs = useRef<Partial<Record<AuthField, HTMLInputElement | null>>>({});

  const [values, setValues] = useState<AuthValues>({ name: "", email: "", password: "" });
  const [touched, setTouched] = useState<Partial<Record<AuthField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  // Errors from the server for a specific field; cleared when that field changes.
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  const signInHref = `/sign-in${callbackURL === "/account" ? "" : `?callbackURL=${encodeURIComponent(callbackURL)}`}`;

  function handleError(error: ClientError): SubmitState {
    const code = error.code ?? "";
    if (error.status === 429) {
      return { formError: "Too many attempts. Wait a few seconds, then try again.", focus: "form-error" };
    }
    if (code === "INVALID_EMAIL_OR_PASSWORD" || error.status === 401) {
      // Same message for an unknown email and a wrong password, so accounts can't be probed.
      // Clear the password without flagging the now-empty field until the next blur or submit.
      setValues((v) => ({ ...v, password: "" }));
      setSubmitted(false);
      setTouched((t) => ({ ...t, password: false }));
      return { formError: "That email and password don't match an account. Check them and try again.", focus: "form-error" };
    }
    if (code.startsWith("USER_ALREADY_EXISTS")) {
      setServerErrors({ email: "An account with this email already exists." });
      return { focus: "email" };
    }
    if (code === "INVALID_EMAIL") {
      setServerErrors({ email: "Enter a valid email address, like name@example.com." });
      return { focus: "email" };
    }
    if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") {
      setServerErrors({ password: validateField("sign-up", "password", values.password) ?? "Choose a different password." });
      return { focus: "password" };
    }
    if (code === "BANNED_USER") {
      return {
        focus: "form-error",
        formError: "This account has been suspended.",
      };
    }
    return { formError: "Something went wrong on our side. Please try again in a moment.", focus: "form-error" };
  }

  const [state, action, pending] = useActionState<SubmitState, FormData>(async () => {
    setSubmitted(true);
    const errors = validateAll(mode, values);
    const first = fieldsFor(mode).find((f) => errors[f]);
    if (first) return { fieldErrors: errors, focus: first };

    let error: ClientError | null = null;
    try {
      const email = values.email.trim();
      const result =
        mode === "sign-in"
          ? await authClient.signIn.email({ email, password: values.password })
          : await authClient.signUp.email({ name: values.name.trim(), email, password: values.password });
      error = result.error;
    } catch {
      return { formError: "We couldn't connect. Check your internet connection and try again.", focus: "form-error" };
    }

    if (!error) {
      router.replace(callbackURL);
      router.refresh();
      return { redirecting: true };
    }
    return handleError(error);
  }, {});

  function errorFor(field: AuthField): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    if (!submitted && !touched[field]) return undefined;
    return validateField(mode, field, values[field]);
  }

  function update(field: AuthField, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    if (serverErrors[field]) setServerErrors((e) => ({ ...e, [field]: undefined }));
  }

  const busy = pending || Boolean(state.redirecting);

  // The fieldset is disabled while pending, so focus can only move afterwards.
  useEffect(() => {
    if (busy || !state.focus) return;
    if (state.focus === "form-error") formErrorRef.current?.focus();
    else inputRefs.current[state.focus]?.focus();
  }, [state, busy]);
  const buttonLabel = state.redirecting
    ? "Redirecting…"
    : pending
      ? mode === "sign-in"
        ? "Signing in…"
        : "Creating account…"
      : mode === "sign-in"
        ? "Sign in"
        : "Create account";

  return (
    <form action={action} noValidate aria-busy={busy} className="stack gap-6">
      {state.formError && !busy ? (
        <p
          ref={formErrorRef}
          id={`${id}-form-error`}
          role="alert"
          tabIndex={-1}
          className="border-l-2 border-danger py-1 pl-4 text-meta text-danger outline-none"
        >
          {state.formError}
        </p>
      ) : null}

      <fieldset disabled={busy} className="stack min-w-0 gap-6">
        <legend className="sr-only">{mode === "sign-in" ? "Sign in details" : "Account details"}</legend>
        {fieldsFor(mode).map((field) => {
          const error = errorFor(field);
          const hint = field === "password" && mode === "sign-up" ? `At least ${PASSWORD_MIN} characters.` : undefined;
          const inputId = `${id}-${field}`;
          const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-error`].filter(Boolean).join(" ") || undefined;
          const isPassword = field === "password";

          return (
            <div key={field} className="stack gap-1">
              <label htmlFor={inputId} className="eyebrow">
                {labels[field]}
              </label>
              <div className="relative">
                <input
                  ref={(el) => {
                    inputRefs.current[field] = el;
                  }}
                  id={inputId}
                  name={field}
                  type={isPassword ? (showPassword ? "text" : "password") : field === "email" ? "email" : "text"}
                  inputMode={field === "email" ? "email" : undefined}
                  autoComplete={
                    field === "name"
                      ? "name"
                      : field === "email"
                        ? "email"
                        : mode === "sign-up"
                          ? "new-password"
                          : "current-password"
                  }
                  autoCapitalize={field === "name" ? "words" : "none"}
                  spellCheck={false}
                  required
                  value={values[field]}
                  onChange={(e) => update(field, e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, [field]: true }))}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={describedBy}
                  className={`field ${isPassword ? "pr-16" : ""}`}
                />
                {isPassword ? (
                  <button
                    type="button"
                    className="btn btn-text absolute top-1/2 right-0 -translate-y-1/2 text-micro"
                    aria-controls={inputId}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                ) : null}
              </div>
              {hint ? (
                <p id={`${inputId}-hint`} className="text-meta text-muted">
                  {hint}
                </p>
              ) : null}
              {error ? (
                <p id={`${inputId}-error`} className="text-meta text-danger">
                  {error}
                  {field === "email" && serverErrors.email?.includes("already exists") ? (
                    <>
                      {" "}
                      <Link href={signInHref} className="link">
                        Sign in instead
                      </Link>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
          );
        })}
      </fieldset>

      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? (
          <span
            aria-hidden="true"
            className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {buttonLabel}
      </button>
      <p className="sr-only" role="status" aria-live="polite">
        {busy ? buttonLabel : ""}
      </p>
    </form>
  );
}
