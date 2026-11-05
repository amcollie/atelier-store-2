"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { adminAction } from "@/lib/admin/action";
import type { AdminActionState } from "@/lib/admin/action-types";
import { createProduct, updateProduct } from "@/lib/admin/catalog";
import { createProductSchema, parseWith, productFormInput, updateProductSchema } from "@/lib/admin/schemas";

// Stock saves live in src/app/admin/stock/actions.ts (shared with this route's edit page).

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
