"use client";

import { useActionState } from "react";

import { type CheckoutState, startCheckout } from "@/app/checkout/actions";

// Starts Stripe Checkout. Sends no prices or quantities: the server action
// rebuilds the order from the bag cookie and the database, then redirects to Stripe.
export function CheckoutButton() {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});

  return (
    <form action={action} className="stack gap-3">
      <button type="submit" className="btn btn-primary btn-block" aria-disabled={pending || undefined}>
        {pending ? (
          <span
            aria-hidden="true"
            className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {pending ? "Starting checkout…" : "Checkout"}
      </button>
      <p role="status" aria-live="polite" className={state.error && !pending ? "text-meta text-danger" : "sr-only"}>
        {pending ? "Starting secure checkout" : (state.error ?? "")}
      </p>
    </form>
  );
}
