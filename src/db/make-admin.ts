// Promotes an existing user to admin: pnpm auth:make-admin <email>
// Relative imports only, so tsx can run it outside Next.
import { eq } from "drizzle-orm";

import { db } from "./index";
import { user } from "./schema";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: pnpm auth:make-admin <email>");
    process.exit(1);
  }

  const updated = await db
    .update(user)
    .set({ role: "admin" })
    .where(eq(user.email, email))
    .returning({ id: user.id, email: user.email });

  if (updated.length === 0) {
    console.error(`No user with email ${email}. Sign up first, then run this again.`);
    process.exit(1);
  }
  console.log(`${updated[0].email} is now an admin.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
