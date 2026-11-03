"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";

import { addToCart } from "@/app/bag/actions";
import type { CartActionState } from "@/lib/cart-types";
import type { Product } from "@/lib/catalog-types";

// Size selection and add-to-bag. Sends only the slug, size and quantity; the
// server action checks live stock and the price always comes from the database.
export function ProductPurchase({ product }: { product: Product }) {
  const sizes = product.sizes ?? [];
  const soldOut = product.stock.status === "out_of_stock";
  const onlySize = sizes.length === 1 && sizes[0].available ? sizes[0].label : null;

  const [size, setSize] = useState<string | null>(onlySize);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const groupId = useId();

  const [, action, pending] = useActionState<CartActionState, FormData>(async (prev, formData) => {
    if (sizes.length > 1 && !size) {
      setMessage({ kind: "error", text: "Please select a size." });
      return prev;
    }
    try {
      const result = await addToCart(prev, formData);
      setMessage(result.message ? { kind: result.status === "ok" ? "ok" : "error", text: result.message } : null);
      return result;
    } catch {
      setMessage({ kind: "error", text: "We couldn't add that item. Check your connection and try again." });
      return prev;
    }
  }, {});

  return (
    <form action={action} className="stack gap-5">
      <input type="hidden" name="slug" value={product.slug} />
      <input type="hidden" name="size" value={size ?? ""} />
      {sizes.length > 1 && !soldOut ? (
        <fieldset className="stack gap-3">
          <legend className="mb-3 flex w-full items-center justify-between">
            <span className="eyebrow">Size{size ? `: ${size}` : ""}</span>
            <a
              href="#size-guide"
              className="link text-meta text-muted"
              onClick={() => {
                const guide = document.getElementById("size-guide");
                if (guide instanceof HTMLDetailsElement) guide.open = true;
              }}
            >
              Size guide
            </a>
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {sizes.map((s) => (
              <label
                key={s.label}
                className={`relative flex min-h-11 items-center justify-center border text-meta transition-colors duration-200 ${
                  !s.available
                    ? "cursor-not-allowed border-line text-muted line-through"
                    : size === s.label
                      ? "cursor-pointer border-ink bg-ink text-paper"
                      : "cursor-pointer border-line hover:border-ink"
                } has-focus-visible:outline has-focus-visible:outline-1 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink`}
              >
                <input
                  type="radio"
                  name={groupId}
                  value={s.label}
                  disabled={!s.available}
                  checked={size === s.label}
                  onChange={() => {
                    setSize(s.label);
                    setMessage(null);
                  }}
                  className="sr-only"
                />
                {s.label}
                {!s.available ? <span className="sr-only"> (unavailable)</span> : null}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block" disabled={soldOut || pending} aria-disabled={pending}>
        {pending ? (
          <span
            aria-hidden="true"
            className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
      </button>

      <p
        role="status"
        className={`min-h-4 text-meta ${message?.kind === "error" ? "text-danger" : "text-ink"}`}
      >
        {message?.text}
        {message?.kind === "ok" ? (
          <>
            {" "}
            <Link href="/bag" className="link">
              View bag
            </Link>
          </>
        ) : null}
      </p>
    </form>
  );
}
