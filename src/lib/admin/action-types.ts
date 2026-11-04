// Shared with client forms, so no server-only import here.

/** What every admin server action returns to its form. */
export type AdminActionState = {
  status: "idle" | "ok" | "error";
  message?: string;
  /** Field name → message, for inline errors. */
  fieldErrors?: Record<string, string>;
};

export const IDLE: AdminActionState = { status: "idle" };

/** Stock saves also return the quantity now stored, so the form can retry against it after a conflict. */
export type StockActionState = AdminActionState & { quantity?: number };
