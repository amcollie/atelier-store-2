"use client";

import { useActionState, useId } from "react";

import { setStockAction } from "@/app/admin/products/actions";
import { IDLE, type StockActionState } from "@/lib/admin/action-types";
import { PRODUCT_LIMITS } from "@/lib/admin/schemas";

// Sets a product's available quantity. Sends the number the admin saw as
// `expected`; the server saves only if stock still equals it, because open
// checkouts change the same number. After a conflict it retries against the
// quantity the server reported.
export function StockForm({ productId, quantity, held }: { productId: number; quantity: number; held: number }) {
  const id = useId();
  const [state, action, pending] = useActionState<StockActionState, FormData>(setStockAction, IDLE);
  const expected = state.quantity ?? quantity;

  return (
    <form action={action} className="stack gap-3" noValidate>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="expected" value={expected} />
      <label htmlFor={`${id}-quantity`} className="eyebrow">
        Available quantity
      </label>
      <div className="flex flex-wrap items-end gap-4">
        <input
          id={`${id}-quantity`}
          name="quantity"
          className="field w-32 tabular-nums"
          inputMode="numeric"
          // React resets the form after the action; show the quantity the server now holds.
          defaultValue={expected}
          max={PRODUCT_LIMITS.maxStock}
          aria-describedby={`${id}-hint ${id}-status`}
          aria-invalid={state.status === "error" && state.fieldErrors?.quantity ? true : undefined}
        />
        <button type="submit" className="btn btn-secondary" aria-disabled={pending || undefined}>
          {pending ? "Saving…" : "Update stock"}
        </button>
      </div>
      <p id={`${id}-hint`} className="text-meta text-muted">
        Units ready to sell now, shared by all sizes.{" "}
        {held > 0
          ? `${held} more ${held === 1 ? "is" : "are"} held in open checkouts and return here if those checkouts don't complete.`
          : "None are held in open checkouts."}
      </p>
      <p
        id={`${id}-status`}
        role="status"
        aria-live="polite"
        className={`text-meta ${state.status === "error" ? "text-danger" : state.status === "ok" ? "text-success" : "sr-only"}`}
      >
        {pending ? "Saving stock" : (state.message ?? "")}
      </p>
    </form>
  );
}
