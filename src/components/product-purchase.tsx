"use client";

import { useId, useState } from "react";

import type { Product } from "@/lib/catalog-types";

// Size selection and add-to-bag. Front-end only until the cart exists.
export function ProductPurchase({ product }: { product: Product }) {
  const sizes = product.sizes ?? [];
  const soldOut = product.stock.status === "out_of_stock";
  const onlySize = sizes.length === 1 && sizes[0].available ? sizes[0].label : null;

  const [size, setSize] = useState<string | null>(onlySize);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const groupId = useId();

  const addToBag = () => {
    if (sizes.length > 0 && !size) {
      setMessage({ kind: "error", text: "Please select a size." });
      return;
    }
    setMessage({ kind: "ok", text: `Added to your bag${size ? ` · Size ${size}` : ""}.` });
  };

  return (
    <div className="stack gap-5">
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

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={soldOut}
        onClick={addToBag}
      >
        {soldOut ? "Sold out" : "Add to bag"}
      </button>

      <p
        role="status"
        className={`min-h-4 text-meta ${message?.kind === "error" ? "text-danger" : "text-ink"}`}
      >
        {message?.text}
      </p>
    </div>
  );
}
