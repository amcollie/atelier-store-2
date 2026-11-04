/** True when a database error (or one it wraps as `cause`) violated the named constraint. */
export function isConstraint(error: unknown, name: string): boolean {
  for (let e: unknown = error; e && typeof e === "object"; e = (e as { cause?: unknown }).cause) {
    if ((e as { constraint?: string }).constraint === name) return true;
  }
  return false;
}
