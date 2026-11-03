"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";

import { removeFromCart, updateQuantity } from "@/app/bag/actions";
import type { CartActionState, CartLine } from "@/lib/cart-types";
import { formatPrice } from "@/lib/sample-data";

// Bag rows with a quantity stepper and remove. The buttons only send the slug,
// size and requested quantity; the server re-checks stock and recomputes the
// prices and subtotal, then re-renders the page. The status region lives here,
// not in a row, so "Item removed" is still announced after the row unmounts.

type Status = { kind: "ok" | "error"; text: string } | null;

export function BagLines({ lines }: { lines: CartLine[] }) {
  const [status, setStatus] = useState<Status>(null);

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <BagLineRow key={line.key} line={line} onResult={setStatus} />
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {status?.text}
      </p>
    </>
  );
}

function BagLineRow({ line, onResult }: { line: CartLine; onResult: (s: Status) => void }) {
  const [rowError, setRowError] = useState<string | null>(null);

  const report = (result: CartActionState) => {
    const kind = result.status === "error" ? "error" : "ok";
    if (result.message) onResult({ kind, text: result.message });
    // Errors and "only N available" stay visible on the row; plain success doesn't need to.
    setRowError(kind === "error" || result.message?.startsWith("Only") ? (result.message ?? null) : null);
  };

  const run =
    (fn: typeof updateQuantity, { focusHeadingOnSuccess = false } = {}) =>
    async (prev: CartActionState, formData: FormData): Promise<CartActionState> => {
      try {
        const result = await fn(prev, formData);
        report(result);
        // The row is about to unmount; keep keyboard focus on the page instead of losing it to <body>.
        if (focusHeadingOnSuccess && result.status === "ok") document.getElementById("bag-title")?.focus();
        return result;
      } catch {
        const result: CartActionState = {
          status: "error",
          message: "We couldn't update your bag. Check your connection and try again.",
        };
        report(result);
        return result;
      }
    };

  const [, update, updating] = useActionState(run(updateQuantity), {});
  const [, remove, removing] = useActionState(run(removeFromCart, { focusHeadingOnSuccess: true }), {});
  const busy = updating || removing;
  const unavailable = line.issue === "unavailable";
  const ids = (
    <>
      <input type="hidden" name="slug" value={line.slug} />
      <input type="hidden" name="size" value={line.size ?? ""} />
    </>
  );

  return (
    <li className="grid grid-cols-[5.5rem_1fr] gap-4 py-6 md:grid-cols-[7.5rem_1fr] md:gap-6" aria-busy={busy}>
      <Link href={line.href} className="media-frame block aspect-[4/5]" tabIndex={-1} aria-hidden="true">
        <Image
          src={line.image.src}
          alt=""
          fill
          sizes="(width >= 48rem) 7.5rem, 5.5rem"
          className={unavailable ? "opacity-60" : undefined}
        />
      </Link>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
          <div className="stack min-w-0 gap-1 text-meta">
            <h3 className="text-meta font-normal normal-case">
              <Link href={line.href} className="link-quiet">
                {line.name}
              </Link>
            </h3>
            {line.size ? <p className="text-muted">Size {line.size}</p> : null}
            <p className="text-muted tabular-nums">{formatPrice(line.priceCents)} each</p>
          </div>
          <p className={`text-meta font-medium tabular-nums ${unavailable ? "text-muted" : ""}`}>
            {unavailable ? "—" : formatPrice(line.lineTotalCents)}
          </p>
        </div>

        {unavailable ? (
          <p className="text-meta text-danger">No longer available. It isn&rsquo;t included in your subtotal.</p>
        ) : (
          <form action={update} className="flex items-center gap-4">
            {ids}
            <div className="flex items-center border border-line" role="group" aria-label={`Quantity, ${line.name}`}>
              <button
                type="submit"
                name="qty"
                value={line.qty - 1}
                className="btn btn-icon"
                disabled={busy || line.qty <= 1}
                aria-label="Decrease quantity"
              >
                <span aria-hidden="true">−</span>
              </button>
              <span className="min-w-8 text-center text-meta tabular-nums" aria-live="off">
                {line.qty}
              </span>
              <button
                type="submit"
                name="qty"
                value={line.qty + 1}
                className="btn btn-icon"
                disabled={busy || line.qty >= line.maxQty}
                aria-label="Increase quantity"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
            {busy ? (
              <span
                aria-hidden="true"
                className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
              />
            ) : null}
            <p className="text-meta text-muted">
              {line.issue === "reduced"
                ? `Only ${line.maxQty} available`
                : line.qty >= line.maxQty
                  ? "Maximum available"
                  : line.lowStock
                    ? `Only ${line.lowStock} left`
                    : null}
            </p>
          </form>
        )}

        {rowError ? <p className="text-meta text-danger">{rowError}</p> : null}

        <form action={remove}>
          {ids}
          <button type="submit" className="btn btn-text text-micro" disabled={busy} aria-label={`Remove ${line.name}`}>
            Remove
          </button>
        </form>
      </div>
    </li>
  );
}
