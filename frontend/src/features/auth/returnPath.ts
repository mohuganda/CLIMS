/**
 * The path to send someone to after signing in: where they were headed when
 * the guard intercepted them, if that is a path inside this app.
 *
 * The value comes from router state, which a crafted link can influence, so
 * anything that could leave the site (`//evil.example`, `https://…`,
 * `/\evil.example`) or loop back to sign-in falls back to `fallback`.
 */
export function safeReturnPath(candidate: unknown, fallback: string, signInPath: string): string {
  if (typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  // Control characters have no place in a path and are a header-splitting vector.
  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate.charCodeAt(index) < 0x20) return fallback;
  }
  if (candidate === signInPath || candidate.startsWith(`${signInPath}?`)) return fallback;
  return candidate;
}
