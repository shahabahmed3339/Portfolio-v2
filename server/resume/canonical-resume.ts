import fs from "node:fs";
import path from "node:path";
import { toRootRelativeAsset } from "@/server/assets/asset-path";
import { resumeSchema, type Resume } from "./resume-schema";

/**
 * Loads the canonical/master resume.
 *
 * `src/data.js` is the project's source of truth and is treated as read-only.
 * This module never writes to it. Two loading strategies are used, mirroring
 * the defensive approach already taken by `prisma/seed.ts`:
 *
 *   1. A native ESM `import()`, which is what Next.js normally resolves.
 *   2. A filesystem fallback that evaluates the `export const data = {...}`
 *      object literal directly, for environments where ESM/CJS interop fails.
 *
 * The result is validated against the resume schema so a malformed data file
 * surfaces as a clear error rather than a half-rendered portfolio.
 */

let cached: Resume | null = null;

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Reads src/data.js from disk and evaluates its `export const data = {...}`
 * literal. Used only as a fallback when the ESM import fails.
 */
function readDataFromFile(): Record<string, any> {
  const filePath = path.join(process.cwd(), "src", "data.js");
  const source = fs.readFileSync(filePath, "utf8");

  const match = source.match(/export\s+const\s+data\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) {
    throw new Error("could not locate `export const data = {...}` in src/data.js");
  }
  const literal = match[1].replace(/;\s*$/, "");

  // eslint-disable-next-line no-new-func
  const evaluate = new Function(`return (${literal});`);
  return evaluate();
}

/** Returns the raw `data` object from src/data.js. */
async function loadRawData(): Promise<Record<string, any>> {
  let candidate: unknown;

  try {
    const mod: any = await import("@/src/data");
    candidate = mod?.data ?? mod?.default?.data ?? mod?.default;
  } catch {
    candidate = readDataFromFile();
  }

  if (!isObject(candidate)) {
    throw new Error("src/data.js does not export a usable `data` object");
  }
  return candidate;
}

/**
 * Returns the canonical resume, validated against the resume schema.
 *
 * The parsed object is cached for the lifetime of the server process: the file
 * only changes on redeploy, so re-reading and re-parsing it on every request
 * would be wasted work. `reloadCanonicalResume()` clears the cache if needed.
 */
export async function getCanonicalResume(): Promise<Resume> {
  if (cached) return cached;

  const raw = await loadRawData();
  const parsed = resumeSchema.safeParse(normalizeAssetPaths(raw));

  if (!parsed.success) {
    // Surface exactly which part of the data file is malformed, without leaking
    // anything beyond the schema issue itself.
    throw new Error(
      `src/data.js does not match the resume schema: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Rewrites every asset path in the resume data to root-relative form.
 *
 * Applied once, when the resume is loaded, so both the root portfolio page and
 * every tailored resume served at /<slug> render the same images. Without this,
 * the relative paths in `src/data.js` (e.g. `assets/linkedin.svg`) resolve
 * against the versioned URL and 404.
 */
function normalizeAssetPaths(raw: Record<string, any>): Record<string, any> {
  const head = isObject(raw.head) ? raw.head : {};

  return {
    ...raw,
    backgroundVideo: toRootRelativeAsset(raw.backgroundVideo),
    resume: toRootRelativeAsset(raw.resume),
    head: {
      ...head,
      profile: toRootRelativeAsset(head.profile),
      links: Array.isArray(head.links)
        ? head.links.map((link: any) =>
            isObject(link) ? { ...link, icon: toRootRelativeAsset(link.icon) } : link,
          )
        : head.links,
    },
    experience: mapImages(raw.experience),
    education: mapImages(raw.education),
    technologies: Array.isArray(raw.technologies)
      ? raw.technologies.map((tech: any) =>
          isObject(tech) ? { ...tech, icon: toRootRelativeAsset(tech.icon) } : tech,
        )
      : raw.technologies,
  };
}

/** Normalises the `image` field of each entry in an experience/education list. */
function mapImages(entries: unknown): unknown {
  if (!Array.isArray(entries)) return entries;
  return entries.map((entry: any) =>
    isObject(entry) ? { ...entry, image: toRootRelativeAsset(entry.image) } : entry,
  );
}

/** Clears the in-process canonical resume cache (used by tests/dev tooling). */
export function reloadCanonicalResume(): void {
  cached = null;
}

/**
 * The canonical resume in the same JSON shape stored in `ResumeVersion.resumeJson`,
 * i.e. with all optional collections present as empty arrays rather than absent.
 */
export async function getCanonicalResumeJson(): Promise<Record<string, unknown>> {
  const resume = await getCanonicalResume();
  return resume as unknown as Record<string, unknown>;
}