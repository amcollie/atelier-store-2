"use client";

import { type FormEvent, startTransition, useActionState, useId, useState } from "react";

import { setStockAction } from "@/app/admin/stock/actions";
import { IDLE, type StockActionState } from "@/lib/admin/action-types";
import { PRODUCT_LIMITS, parseWith, stockFormInput, stockSchema } from "@/lib/admin/schemas";

type Props = {
  productId: number;
  /** Available quantity from the latest server render. */
  quantity: number;
  held: number;
  /** "full" on the product edit page; "compact" for rows on /admin/stock. */
  variant?: "full" | "compact";
  /** Product name, for the compact variant's accessible label. */
  productName?: string;
};

// Sets a product's available quantity. Sends the number the admin saw as
// `expected`; the server saves only if stock still equals it, because open
// checkouts change the same number. After a save or a conflict, `expected` (and
// the input) follow the quantity the server reported.
//
// Submits from onSubmit inside a transition, not through React's form action,
// because React resets a form after its action and would wipe a rejected value.
// The `action` prop is the no-JavaScript fallback; onSubmit prevents it once
// the page has hydrated.
export function StockForm({ productId, quantity, held, variant = "full", productName }: Props) {
  const id = useId();
  const [state, formAction, pending] = useActionState<StockActionState, FormData>(setStockAction, IDLE);
  const [expected, setExpected] = useState(quantity);
  const [draft, setDraft] = useState(String(quantity));
  const [clientError, setClientError] = useState<string | null>(null);
  const [seen, setSeen] = useState({ quantity, state });

  // Follow the server (adjusting state during render, not in an effect).
  if (seen.state !== state || seen.quantity !== quantity) {
    setSeen({ quantity, state });
    if (seen.state !== state && state.quantity !== undefined) {
      // Saved, or a conflict reported the current number.
      setExpected(state.quantity);
      setDraft(String(state.quantity));
    } else if (seen.quantity !== quantity && draft === String(expected)) {
      // A newer render (another save, a checkout) and the admin hasn't typed
      // here. With an edit in progress `expected` stays put, so a save
      // conflicts instead of applying the edit to a number they never saw.
      setExpected(quantity);
      setDraft(String(quantity));
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    const parsed = parseWith(stockSchema, stockFormInput(formData));
    if (!parsed.ok) {
      setClientError(parsed.fieldErrors.quantity ?? "Reload the page and try again.");
      return;
    }
    setClientError(null);
    startTransition(() => formAction(formData));
  }

  const compact = variant === "compact";
  const error = clientError ?? (state.status === "error" && !pending ? (state.message ?? null) : null);
  const quantityError = Boolean(clientError ?? state.fieldErrors?.quantity);
  const message = pending ? "Saving stock" : (error ?? (state.status === "ok" ? state.message : "")) || "";
  const tone = error ? "text-danger" : state.status === "ok" && !pending ? "text-success" : compact ? "text-muted" : "sr-only";

  return (
    <form action={formAction} onSubmit={onSubmit} className={compact ? "stack gap-2" : "stack gap-3"} noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="expected" value={expected} />
      <label htmlFor={`${id}-quantity`} className={compact ? "sr-only" : "eyebrow"}>
        {compact && productName ? `Available quantity for ${productName}` : "Available quantity"}
      </label>
      <div className={compact ? "flex items-center gap-3" : "flex flex-wrap items-end gap-4"}>
        <input
          id={`${id}-quantity`}
          name="quantity"
          className={`field tabular-nums ${compact ? "w-24" : "w-32"}`}
          inputMode="numeric"
          autoComplete="off"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (clientError) setClientError(null);
          }}
          max={PRODUCT_LIMITS.maxStock}
          aria-describedby={compact ? `${id}-status` : `${id}-hint ${id}-status`}
          aria-invalid={quantityError || undefined}
        />
        <button type="submit" className="btn btn-secondary" aria-disabled={pending || undefined}>
          {pending ? "Saving…" : compact ? "Save" : "Update stock"}
        </button>
      </div>
      {compact ? null : (
        <p id={`${id}-hint`} className="text-meta text-muted">
          Units ready to sell now, shared by all sizes.{" "}
          {held > 0
            ? `${held} more ${held === 1 ? "is" : "are"} held in open checkouts and return here if those checkouts don't complete.`
            : "None are held in open checkouts."}
        </p>
      )}
      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={`text-meta ${tone} ${compact && !message ? "sr-only" : ""}`}
      >
        {message}
      </p>
    </form>
  );
}
