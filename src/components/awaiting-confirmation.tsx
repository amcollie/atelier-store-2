"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

// Shown on an order page while Stripe hasn't confirmed payment yet. Re-renders
// the page from the database every few seconds; once the webhook marks the
// order paid (or failed), the server stops rendering this component and the
// polling ends. It only reads our order state: nothing here can mark it paid.

const INTERVAL_MS = 3000;
const MAX_CHECKS = 20; // about a minute, then hand over to a manual button

/** `children`: the page's other actions, kept on the same row as "Check again". */
export function AwaitingConfirmation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [round, setRound] = useState(0); // bumped by "Check again" to restart polling
  const [waiting, setWaiting] = useState(true);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let checks = 0;
    const id = setInterval(() => {
      checks += 1;
      router.refresh();
      if (checks >= MAX_CHECKS) {
        clearInterval(id);
        setWaiting(false);
      }
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [router, round]);

  return (
    <>
      {/* One live region whose text changes, so the switch to the slow-path message is announced. */}
      <p
        ref={statusRef}
        role="status"
        tabIndex={-1}
        className="flex max-w-prose items-start gap-3 text-meta text-muted outline-none"
      >
        {waiting ? (
          <span
            aria-hidden="true"
            className="mt-1 size-3 shrink-0 animate-spin border border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {waiting
          ? "Checking for confirmation. This page updates on its own."
          : "This is taking longer than usual. If you were charged, your order is safe: we’ll confirm it as soon as our payment provider does."}
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {waiting ? null : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              router.refresh();
              setWaiting(true);
              setRound((r) => r + 1);
              // The button unmounts while polling; keep keyboard focus on the message instead of <body>.
              statusRef.current?.focus();
            }}
          >
            Check again
          </button>
        )}
        {children}
      </div>
    </>
  );
}
