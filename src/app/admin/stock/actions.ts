"use server";

import { updateTag } from "next/cache";

import { adminAction } from "@/lib/admin/action";
import type { StockActionState } from "@/lib/admin/action-types";
import { setStock } from "@/lib/admin/catalog";
import { parseWith, stockFormInput, stockSchema } from "@/lib/admin/schemas";

// Shared by /admin/stock and the product edit page. The role is checked per call
// (adminAction) and the input is parsed again here; the browser's checks are
// only for instant feedback.
export const setStockAction = adminAction<StockActionState>(async (_admin, _prev, formData) => {
  const parsed = parseWith(stockSchema, stockFormInput(formData));
  if (!parsed.ok) {
    return {
      status: "error",
      message: parsed.fieldErrors.quantity ?? "Reload the page and try again.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const { productId, expected, quantity } = parsed.data;
  const result = await setStock(productId, expected, quantity);
  if (!result.ok) {
    if (result.reason === "not_found") return { status: "error", message: "This product no longer exists." };
    return {
      status: "error",
      quantity: result.quantity,
      message: `Stock changed to ${result.quantity} since you loaded this page (a checkout may have started or finished). Check the number and save again.`,
    };
  }

  // Product and collection pages are cached under "catalog"; the bag and
  // checkout read stock live, so they need no invalidation.
  updateTag("catalog");
  return { status: "ok", quantity: result.quantity, message: `Saved: ${result.quantity} available.` };
});
