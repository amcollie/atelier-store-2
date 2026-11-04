// Image hosts next/image may load from. next.config.ts builds `remotePatterns`
// from this list and the admin product form validates URLs against it, so the
// two can't drift apart. Pathnames ending in `**` match any path with that prefix.

export const ALLOWED_IMAGE_PATTERNS = [
  // Sample catalogue photography; remove once product images are self-hosted.
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/photo-**" },
] as const;

/** Human-readable list for error messages, e.g. "images.unsplash.com". */
export const ALLOWED_IMAGE_HOSTS = ALLOWED_IMAGE_PATTERNS.map((p) => p.hostname).join(", ");

export function isAllowedImageUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.port) return false;
  return ALLOWED_IMAGE_PATTERNS.some((p) => {
    if (url.protocol !== `${p.protocol}:` || url.hostname !== p.hostname) return false;
    return p.pathname.endsWith("**") ? url.pathname.startsWith(p.pathname.slice(0, -2)) : url.pathname === p.pathname;
  });
}
