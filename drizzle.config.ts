import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// Drizzle Studio exposes an unauthenticated SQL endpoint on localhost (patched
// in patches/drizzle-kit@*.patch, but still worth containing), so it connects
// with its own STUDIO_DATABASE_URL: a Neon dev branch or a limited role, never
// the main/production credentials. Other commands keep using DATABASE_URL.
const isStudio = process.argv.includes("studio");
const url = isStudio ? process.env.STUDIO_DATABASE_URL : process.env.DATABASE_URL;

if (isStudio && !url) {
  throw new Error(
    "STUDIO_DATABASE_URL is not set. Point it at a Neon dev branch or a limited role (see .env.example).",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: url!,
  },
});
