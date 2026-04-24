/**
 * Returns `path` only if it is a safe same-origin redirect target —
 * otherwise falls back to `fallback`.
 *
 * Blocks:
 *   - Absolute URLs (http://evil.com)
 *   - Protocol-relative URLs (//evil.com, /\evil.com)
 *   - Non-path values
 */
export function safeNextPath(
  path: string | null | undefined,
  fallback: string
): string {
  if (typeof path !== 'string' || path.length === 0) return fallback;
  if (!path.startsWith('/')) return fallback;
  // Protocol-relative — //evil.com or /\evil.com
  if (path.startsWith('//') || path.startsWith('/\\')) return fallback;
  return path;
}
