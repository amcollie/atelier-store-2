import "server-only";

import { type CurrentUser, getAdminForAction } from "@/lib/session";

import type { AdminActionState } from "./action-types";

export const NOT_ALLOWED: AdminActionState = { status: "error", message: "Not allowed." };

/**
 * Wraps every admin server action (use with useActionState). The role is
 * checked on each call, before the handler runs, so a non-admin or signed-out
 * POST is refused without touching anything. The handler gets the verified
 * admin. Hiding links or pages is not a security boundary; this is.
 *
 *   export const saveThing = adminAction(async (admin, prev, formData) => { … });
 */
export function adminAction(
  handler: (admin: CurrentUser, prev: AdminActionState, formData: FormData) => Promise<AdminActionState>,
) {
  return async (prev: AdminActionState, formData: FormData): Promise<AdminActionState> => {
    const admin = await getAdminForAction();
    if (!admin) return NOT_ALLOWED;
    return handler(admin, prev, formData);
  };
}
