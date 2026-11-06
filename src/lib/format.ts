// Display formatting shared by server and client components (no server-only).

const wholeDollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const withCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** "$480" for whole dollars, "$1,250.50" otherwise: never rounds, so the shown price is what Stripe charges. */
export const formatPrice = (cents: number) =>
  cents % 100 === 0 ? wholeDollars.format(cents / 100) : withCents.format(cents / 100);

/**
 * The store's time zone. Dates are formatted here, not in whatever zone the
 * server runs in, so an order placed late in the evening shows the same day for
 * everyone.
 */
export const STORE_TIME_ZONE = "America/New_York";

const longDate = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: STORE_TIME_ZONE,
});

/** "November 6, 2026", in the store's time zone. */
export const formatDate = (date: Date) => longDate.format(date);
