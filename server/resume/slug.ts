/**
 * Slug helpers.
 *
 * Slugs are always generated server-side. They must be URL-safe, stable for a
 * given input, and must never expose a database id.
 */

/** Converts arbitrary text into a lowercase, hyphenated, URL-safe slug. */
export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    // Strip diacritics so "Zoë" and "Zoe" produce the same slug.
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return base || "untitled";
}

/**
 * Returns `base`, `base-2`, `base-3`, ... until `exists` reports the candidate
 * as free. Used to keep slugs unique without leaking sequential database ids.
 *
 * `exists` is called at most `maxAttempts` times; if every candidate is taken a
 * short random suffix is used as a final, still-URL-safe fallback.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const root = slugify(base);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const candidate = attempt === 1 ? root : `${root}-${attempt}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Extremely unlikely; keeps the function total rather than throwing.
  return `${root}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Builds the base slug for a job: "acme-senior-frontend-developer". */
export function jobSlugBase(companyName: string, jobTitle: string): string {
  return slugify(`${companyName} ${jobTitle}`);
}

/**
 * Builds the base slug for a resume version from the job's id.
 *
 * A tailored resume is a property of exactly one job, so its public URL is
 * derived from that job's id rather than from free text: the slug stays short,
 * stable across job renames, and can never collide with another job's slug.
 */
export function resumeVersionSlugBase(jobId: string): string {
  return slugify(jobId);
}