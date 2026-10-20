"use client";

import { useState } from "react";

// Front-end only for now: no subscription backend exists yet.
export function NewsletterForm() {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <p role="status" className="text-body">
        Thank you. You&apos;ll hear from us soon.
      </p>
    );
  }

  return (
    <form
      className="flex w-full items-end gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(true);
      }}
    >
      <label className="flex-1">
        <span className="sr-only">Email address</span>
        <input type="email" required autoComplete="email" placeholder="Email address" className="field" />
      </label>
      <button type="submit" className="btn btn-secondary btn-sm">
        Sign up
      </button>
    </form>
  );
}
