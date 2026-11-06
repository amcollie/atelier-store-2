"use client";

import { type FormEvent, useActionState, useRef } from "react";

import { type CheckoutState, startCheckout } from "@/app/checkout/actions";

// Starts Stripe Checkout. Sends no prices or quantities: the server action
// rebuilds the order from the bag cookie and the database, then redirects to
// Stripe. `shownSubtotalCents` (what the bag displayed) is sent only so the
// server can send the shopper back if a price changed meanwhile; it's never charged.
export function CheckoutButton({ shownSubtotalCents }: { shownSubtotalCents: number }) {
  // Blocks a second submit while one is in flight. useActionState queues repeat
  // submits, and a second startCheckout would release the order the first just created.
  const inFlight = useRef(false);
  const [state, action, pending] = useActionState<CheckoutState, FormData>(async (prev, formData) => {
    try {
      return await startCheckout(prev, formData);
    } finally {
      inFlight.current = false;
    }
  }, {});

  const guard = (event: FormEvent<HTMLFormElement>) => {
    if (inFlight.current) event.preventDefault();
    else inFlight.current = true;
  };

  return (
    <form action={action} onSubmit={guard} className="stack gap-3">
      <input type="hidden" name="shownSubtotalCents" value={shownSubtotalCents} />
      <button type="submit" className="btn btn-primary btn-block" aria-disabled={pending || undefined}>
        {pending ? (
          <span
            aria-hidden="true"
            className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {pending ? "Starting secure checkout…" : "Checkout"}
      </button>
      <p role="status" aria-live="polite" className={state.error && !pending ? "text-meta text-danger" : "sr-only"}>
        {pending ? "Starting secure checkout" : (state.error ?? "")}
      </p>
      <p className="text-meta text-muted">
        You&rsquo;ll pay on Stripe&rsquo;s secure page. We set your pieces aside for 30 minutes while you do.
      </p>
    </form>
  );
}
