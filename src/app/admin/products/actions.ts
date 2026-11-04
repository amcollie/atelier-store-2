"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { adminAction } from "@/lib/admin/action";
import type { AdminActionState, StockActionState } from "@/lib/admin/action-types";
import { createProduct, setStock, updateProduct } from "@/lib/admin/catalog";
import {
  createProductSchema,
  parseWith,
  productFormInput,
  stockFormInput,
  stockSchema,
  updateProductSchema,
} from "@/lib/admin/schemas";

// Every action is wrapped in adminAction (role checked per call) and re-parses
// its input with zod; the client's own validation is never trusted. Catalogue
// writes call updateTag("catalog") so the store and admin pages show the change
// on the next render.

const CHECK_FIELDS = "Check the highlighted fields.";

export const createProductAction = adminAction<AdminActionState>(async (_admin, _prev, formData) => {
  const parsed = parseWith(createProductSchema, productFormInput(formData));
  if (!parsed.ok) return { status: "error", message: CHECK_FIELDS, fieldErrors: parsed.fieldErrors };

  const result = await createProduct(parsed.data);
  if (!result.ok) return { status: "error", message: CHECK_FIELDS, fieldErrors: result.fieldErrors };

  updateTag("catalog");
  redirect(`/admin/products/${result.id}/edit?created=1`);
});

export const updateProductAction = adminAction<AdminActionState>(async (_admin, _prev, formData) => {
  const parsed = parseWith(updateProductSchema, productFormInput(formData));
  if (!parsed.ok) return { status: "error", message: CHECK_FIELDS, fieldErrors: parsed.fieldErrors };

  const { id, ...values } = parsed.data;
  const result = await updateProduct(id, values);
  if (!result.ok) {
    if ("notFound" in result) return { status: "error", message: "This product no longer exists." };
    return { status: "error", message: CHECK_FIELDS, fieldErrors: result.fieldErrors };
  }

  updateTag("catalog");
  return { status: "ok", message: "Product saved." };
});

export const setStockAction = adminAction<StockActionState>(async (_admin, _prev, formData) => {
  const parsed = parseWith(stockSchema, stockFormInput(formData));
  if (!parsed.ok) return { status: "error", message: parsed.fieldErrors.quantity ?? CHECK_FIELDS, fieldErrors: parsed.fieldErrors };

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

  updateTag("catalog");
  return { status: "ok", quantity: result.quantity, message: `Saved: ${result.quantity} available.` };
});
