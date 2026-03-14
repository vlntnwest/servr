/**
 * Validates that a redirect target is a safe relative path.
 * Prevents open redirect attacks.
 */
export function isSafeRedirect(redirect: string | null | undefined): redirect is string {
  if (!redirect) return false;
  const decoded = decodeURIComponent(redirect);
  if (!decoded.startsWith("/")) return false;
  if (decoded.startsWith("//")) return false;
  if (decoded.includes("http://") || decoded.includes("https://")) return false;
  return true;
}
