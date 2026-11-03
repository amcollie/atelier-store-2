import Link from "next/link";

import { BagIcon } from "@/components/icons";
import { getCart } from "@/lib/cart";

export function BagLink({ count }: { count: number }) {
  return (
    <Link
      href="/bag"
      className="btn btn-icon relative"
      aria-label={`Shopping bag, ${count} ${count === 1 ? "item" : "items"}`}
    >
      <BagIcon />
      <span className="absolute top-1.5 right-1 text-micro font-bold tabular-nums" aria-hidden="true">
        {count > 0 ? count : null}
      </span>
    </Link>
  );
}

/** Reads the cart cookie: render inside <Suspense fallback={<BagLink count={0} />}>. */
export async function CartBagLink() {
  const { count } = await getCart();
  return <BagLink count={count} />;
}
