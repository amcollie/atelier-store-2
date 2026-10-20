import type { ReactNode } from "react";

// Native <details> accordion row with a hairline above and a +/× marker.
export function Disclosure({
  title,
  id,
  defaultOpen = false,
  children,
}: {
  title: string;
  id?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details id={id} open={defaultOpen} className="group hairline-top">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 eyebrow [&::-webkit-details-marker]:hidden">
        {title}
        <span
          aria-hidden="true"
          className="relative size-3 shrink-0 transition-transform duration-200 group-open:rotate-45"
        >
          <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-ink" />
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink" />
        </span>
      </summary>
      <div className="pb-6 text-meta">{children}</div>
    </details>
  );
}
