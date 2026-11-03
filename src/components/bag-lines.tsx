"use client";

import Image from "next/image";
import Link from "next/link";
import { type MouseEvent, useActionState, useState } from "react";

import { removeFromCart, updateQuantity } from "@/app/bag/actions";
import { StockStatus } from "@/components/stock-status";
import type { CartActionState, CartLine } from "@/lib/cart-types";
import { formatPrice } from "@/lib/sample-data";

// Bag rows with a quantity stepper and remove. The buttons only send the slug,
// size and requested quantity; the server re-checks stock and recomputes the
// prices and subtotal, then re-renders the page. The status region lives here,
// not in a row, so "Item removed" is still announced after the row unmounts.

type Note = { kind: "warning" | "error"; text: string } | null;

export function BagLines({ lines }: { lines: CartLine[] }) {
  const [status, setStatus] = useState("");

  return (
    <>
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <BagLineRow key={line.key} line={line} onAnnounce={setStatus} />
        ))}
      </ul>
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </>
  );
}

/** "Technical bomber jacket, size M": tells apart two sizes of one product in labels. */
const describe = (line: CartLine) => (line.sizeLabel ? `${line.name}, size ${line.sizeLabel}` : line.name);

const notIncluded = "It isn’t included in your subtotal.";

function issueText(line: CartLine): string | null {
  switch (line.issue) {
    case "reduced":
      return `We’ve lowered this to ${line.qty}, the number available.`;
    case "sold_out":
      return notIncluded;
    case "size_unavailable":
      return `Size ${line.size} is no longer available. ${notIncluded}`;
    case "held_elsewhere":
      return `The remaining stock is already in your bag in another size. ${notIncluded}`;
    default:
      return null;
  }
}

function BagLineRow({ line, onAnnounce }: { line: CartLine; onAnnounce: (text: string) => void }) {
  const [note, setNote] = useState<Note>(null);

  const run =
    (fn: typeof updateQuantity, { focusHeadingOnSuccess = false } = {}) =>
    async (prev: CartActionState, formData: FormData): Promise<CartActionState> => {
      let result: CartActionState;
      try {
        result = await fn(prev, formData);
      } catch {
        result = { status: "error", message: "We couldn’t update your bag. Check your connection and try again." };
      }
      if (result.message) onAnnounce(result.message);
      // Keep errors and "only N available" on the row; a plain update needs no note.
      setNote(
        result.status === "error"
          ? { kind: "error", text: result.message ?? "" }
          : result.message?.startsWith("Only")
            ? { kind: "warning", text: result.message }
            : null,
      );
      // The row is about to unmount; keep keyboard focus on the page instead of losing it to <body>.
      if (focusHeadingOnSuccess && result.status === "ok") document.getElementById("bag-title")?.focus();
      return result;
    };

  const [, update, updating] = useActionState(run(updateQuantity), {});
  const [, remove, removing] = useActionState(run(removeFromCart, { focusHeadingOnSuccess: true }), {});
  const busy = updating || removing;
  const unavailable = line.qty === 0;
  const label = describe(line);
  const issue = issueText(line);

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
          className={unavailable ? "opacity-50 grayscale" : undefined}
        />
      </Link>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="stack min-w-0 gap-1 text-meta">
            <h3 className="text-meta font-normal normal-case">
              <Link href={line.href} className="link-quiet">
                {line.name}
              </Link>
            </h3>
            {line.sizeLabel ? <p className="text-muted">Size {line.sizeLabel}</p> : null}
            <p className="text-muted tabular-nums">{formatPrice(line.priceCents)} each</p>
          </div>
          <p className={`shrink-0 text-meta font-medium tabular-nums ${unavailable ? "text-muted" : ""}`}>
            {unavailable ? (
              <>
                <span aria-hidden="true">—</span>
                <span className="sr-only">Not included</span>
              </>
            ) : (
              formatPrice(line.lineTotalCents)
            )}
          </p>
        </div>

        {/* Stock state: sold out, low stock, or a change since the line was added. */}
        {line.issue === "sold_out" ? (
          <StockStatus stock={{ status: "out_of_stock" }} />
        ) : !unavailable && line.lowStock ? (
          <StockStatus stock={{ status: "low_stock", quantity: line.lowStock }} />
        ) : null}
        {issue ? (
          <p className={`text-meta ${unavailable ? "text-muted" : "text-warning"}`}>{issue}</p>
        ) : !unavailable && !line.lowStock && line.qty >= line.maxQty ? (
          <p className="text-meta text-muted">All {line.maxQty} available are in your bag.</p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
          {unavailable ? null : (
            <form action={update} className="flex items-center gap-3">
              {ids}
              <div className="flex items-center border border-line" role="group" aria-label={`Quantity, ${label}`}>
                <StepButton
                  qty={line.qty - 1}
                  disabled={busy || line.qty <= 1}
                  label={`Decrease quantity of ${label}`}
                  symbol="−"
                />
                <output className="min-w-8 text-center text-meta tabular-nums">{line.qty}</output>
                <StepButton
                  qty={line.qty + 1}
                  disabled={busy || line.qty >= line.maxQty}
                  label={`Increase quantity of ${label}`}
                  symbol="+"
                />
              </div>
              {updating ? <Spinner /> : null}
            </form>
          )}

          <form action={remove} className="flex items-center gap-3">
            {ids}
            <button
              type="submit"
              className="btn btn-text text-micro"
              aria-disabled={busy || undefined}
              onClick={preventWhenDisabled}
              aria-label={`Remove ${label}`}
            >
              Remove
            </button>
            {removing ? <Spinner /> : null}
          </form>
        </div>

        {note ? <p className={`text-meta ${note.kind === "error" ? "text-danger" : "text-warning"}`}>{note.text}</p> : null}
      </div>
    </li>
  );
}

/**
 * aria-disabled rather than disabled: a disabled button drops keyboard focus to
 * <body>, which would happen on every step while saving and at the stock limit.
 */
function StepButton({ qty, disabled, label, symbol }: { qty: number; disabled: boolean; label: string; symbol: string }) {
  return (
    <button
      type="submit"
      name="qty"
      value={qty}
      className="btn btn-icon"
      aria-disabled={disabled || undefined}
      onClick={preventWhenDisabled}
      aria-label={label}
    >
      <span aria-hidden="true">{symbol}</span>
    </button>
  );
}

function preventWhenDisabled(event: MouseEvent<HTMLButtonElement>) {
  if (event.currentTarget.getAttribute("aria-disabled") === "true") event.preventDefault();
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-3 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}
