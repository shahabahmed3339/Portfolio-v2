/**
 * Asset path normalisation.
 *
 * Every static asset in this project lives in `public/assets/...` and is
 * referenced from a page URL. A root-relative path (`/assets/x.svg`) resolves
 * the same from any URL, but a bare relative one (`assets/x.svg`) resolves
 * against the *current directory*:
 *
 *   at "/"                 -> /assets/x.svg        (works by accident)
 *   at "/acme-v1"          -> /assets/x.svg        (root-relative, always correct)
 *   at "/acme-v1"          -> /acme-v1/assets/x.svg (bare relative -> 404)
 *
 * `src/data.js` ships mixed styles (the social link icons are written without
 * a leading slash), and rows edited through the admin panel can be too, so
 * paths are normalised here, once, instead of at every `<img src>`.
 */

/**
 * Rewrites `assets/...` to `/assets/...`.
 *
 * Deliberately narrow: absolute paths (`/assets/...`), full URLs
 * (`https://...`), data URIs, protocol-relative URLs (`//...`) and anything
 * else that cannot be confused with a project-relative asset are returned
 * untouched. Non-string and empty input yields `undefined` so callers can
 * treat "no icon" uniformly.
 */
export function toRootRelativeAsset(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const path = value.trim();
  if (!path) return undefined;

  // Already absolute, a full URL (http:, mailto:, data:), or protocol-relative.
  if (path.startsWith("/")) return path;
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  if (path.startsWith("#") || path.startsWith("?")) return path;

  return `/${path}`;
}