import type { NextConfig } from "next";

import { ALLOWED_IMAGE_PATTERNS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    qualities: [75],
    // Shared with the admin product form's URL validation (src/lib/image-hosts.ts).
    remotePatterns: ALLOWED_IMAGE_PATTERNS.map((p) => ({ ...p })),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
