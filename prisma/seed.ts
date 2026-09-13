import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@portfolio.local").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Portfolio Admin";

// ---------------------------------------------------------------------------
// Defensive helpers. The source data file may be absent, may not export
// `data`, or any top-level key / nested field may be missing or the wrong
// type. Nothing here may throw because of bad input.
// ---------------------------------------------------------------------------

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Coerces anything into a string[] (empty for null/undefined/wrong types). */
const toArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

/** Returns a trimmed string, or null when absent/empty. */
const str = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

/** Returns a non-empty string, or null when absent  -  used for required fields. */
const requiredStr = (value: unknown): string | null => str(value);

/** Returns a finite integer, or the fallback. */
const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

/** Normalises a top-level key into an array (missing key -> []). */
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Reads src/data.js from disk and evaluates its `export const data = {...}`
 * object literal directly. Used as a fallback when ESM/CJS interop fails.
 * Throws only when the file is missing or the literal cannot be evaluated.
 */
function readDataFromFile(): Record<string, any> {
  const filePath = path.join(__dirname, "..", "src", "data.js");
  const source = fs.readFileSync(filePath, "utf8");

  // Grab everything after the first `=` in `export const data = ...`.
  const match = source.match(/export\s+const\s+data\s*=\s*([\s\S]*?);?\s*$/);
  if (!match) {
    throw new Error("could not locate `export const data = {...}` in src/data.js");
  }
  const literal = match[1].replace(/;\s*$/, "");

  // eslint-disable-next-line no-new-func
  const evaluate = new Function(`return (${literal});`);
  return evaluate();
}

/**
 * Loads `../src/data.js` safely.
 *
 * Returns the parsed data object when it is present and usable, or `null` when
 * the file is missing, fails to import, has no `data` export, or exports an
 * empty object. A `null` result means "there is no source data", and callers
 * must NOT touch the database.
 */
async function loadSourceData(): Promise<Record<string, any> | null> {
  let candidate: unknown;

  // Primary path: native ESM import. This works when the file is a real ES
  // module. It can fail in CommonJS interop ("require() ESM in a cycle").
  try {
    const mod: any = await import("../src/data.js");
    candidate = mod?.data ?? mod?.default?.data ?? mod?.default;
  } catch (importError) {
    // Fallback: read the file from disk and evaluate the `export const data`
    // object literal directly, bypassing module-system interop entirely.
    try {
      candidate = readDataFromFile();
    } catch (readError) {
      console.warn(
        `[seed] Could not load src/data.js (${(readError as Error).message}).`,
      );
      return null;
    }
  }

  if (!isObject(candidate)) {
    console.warn("[seed] src/data.js has no usable `data` export.");
    return null;
  }

  // Detect the silent-failure case: the module loaded but every key is absent
  // (e.g. the file is an empty `{}`, or all of its content is commented out).
  if (Object.keys(candidate).length === 0) {
    console.warn("[seed] src/data.js exports an empty object (all content commented out?).");
    return null;
  }

  return candidate;
}

/**
 * Runs a createMany only when there is at least one row, so empty input never
 * throws. Reports how many rows were written (and skipped, if any).
 */
async function seedMany(
  label: string,
  create: (rows: any[]) => Promise<{ count: number }>,
  rows: any[],
) {
  if (rows.length === 0) {
    console.log(`[seed] ${label}: nothing to seed (0 rows).`);
    return;
  }
  const { count } = await create(rows);
  console.log(`[seed] ${label}: ${count} row(s).`);
}

async function main() {
  const data = await loadSourceData();

  // No source data -> do nothing at all. We must not wipe existing records or
  // overwrite them with placeholders, so return before the first DB write.
  if (data === null) {
    console.log("[seed] No source data found - skipping seed. Database left unchanged.");
    return;
  }

  const head = isObject(data.head) ? data.head : {};

  // --- Admin user -----------------------------------------------------------
  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, name: ADMIN_NAME, passwordHash, role: "ADMIN" },
  });
  console.log(`[seed] admin user: ${ADMIN_EMAIL}`);

  // --- Profile --------------------------------------------------------------
  // `name` and `title` are required columns. For any field the source omits we
  // keep the existing DB value (or a placeholder only on first insert) instead
  // of overwriting real content with nulls.
  const existing = await prisma.profile.findFirst();
  const keep = <T>(next: T | null, current: T | null | undefined, fallback: T): T =>
    next ?? current ?? fallback;
  const profileData = {
    name: keep(requiredStr(head.name), existing?.name, "Your Name"),
    title: keep(requiredStr(head.title), existing?.title, "Your Title"),
    totalExperience: num(head.totalExperience, existing?.totalExperience ?? 0),
    profile: keep(str(head.profile), existing?.profile, null),
    location: keep(str(head.location), existing?.location, null),
    phone: keep(str(head.phone), existing?.phone, null),
    email: keep(str(head.email), existing?.email, null),
    linkedIn: keep(str(head.linkedIn), existing?.linkedIn, null),
    github: keep(str(head.github), existing?.github, null),
    portfolio: keep(str(head.portfolio), existing?.portfolio, null),
    backgroundVideo: keep(str(data.backgroundVideo), existing?.backgroundVideo, null),
    resume: keep(str(data.resume), existing?.resume, null),
  };
  const profile = existing
    ? await prisma.profile.update({ where: { id: existing.id }, data: profileData })
    : await prisma.profile.create({ data: profileData });
  console.log(`[seed] profile: ${profileData.name}`);

  // Each collection is seeded only when its source key is actually present.
  // A missing key leaves the existing rows untouched (no wipe, no rewrite).
  const has = (key: string): boolean => Array.isArray((data as any)[key]);
  const hasLinks = Array.isArray(head.links);

  // --- Social links (head.links) -------------------------------------------
  if (hasLinks) {
    await prisma.socialLink.deleteMany({ where: { profileId: profile.id }});
    const socialLinks = asArray(head.links)
      .filter(isObject)
      .map((l, i) => ({
        profileId: profile.id,
        title: requiredStr(l.title) as string,
        url: requiredStr(l.url) as string,
        icon: str(l.icon),
        sortOrder: i,
      }))
      .filter((l) => l.title && l.url);
    await seedMany("social links", (rows) => prisma.socialLink.createMany({ data: rows }), socialLinks);
  } else {
    console.log("[seed] social links: source key missing  -  left unchanged.");
  }

  // --- About paragraphs -----------------------------------------------------
  if (has("about")) {
    await prisma.aboutParagraph.deleteMany({});
    const about = asArray(data.about)
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .map((text, i) => ({ text, sortOrder: i }));
    await seedMany("about paragraphs", (rows) => prisma.aboutParagraph.createMany({ data: rows }), about);
  } else {
    console.log("[seed] about paragraphs: source key missing  -  left unchanged.");
  }

  // --- Experience -----------------------------------------------------------
  if (has("experience")) {
    await prisma.experience.deleteMany({});
    const experience = asArray(data.experience)
      .filter(isObject)
      .map((e) => ({
        image: str(e.image),
        title: requiredStr(e.title) as string,
        company: requiredStr(e.company) as string,
        description: str(e.description),
        location: str(e.location),
        start: requiredStr(e.start) as string,
        end: str(e.end),
        accomplishments: toArray(e.accomplishments),
        sortOrder: 0,
      }))
      .filter((e) => e.title && e.company && e.start)
      .map((e, i) => ({ ...e, sortOrder: i }));
    await seedMany("experience", (rows) => prisma.experience.createMany({ data: rows }), experience);
  } else {
    console.log("[seed] experience: source key missing  -  left unchanged.");
  }

  // --- Education ------------------------------------------------------------
  if (has("education")) {
    await prisma.education.deleteMany({});
    const education = asArray(data.education)
      .filter(isObject)
      .map((e) => ({
        image: str(e.image),
        title: requiredStr(e.title) as string,
        institute: requiredStr(e.institute) as string,
        location: str(e.location),
        start: requiredStr(e.start) as string,
        end: str(e.end),
        cgpa: str(e.cgpa),
        thesis: str(e.thesis),
        sortOrder: 0,
      }))
      .filter((e) => e.title && e.institute && e.start)
      .map((e, i) => ({ ...e, sortOrder: i }));
    await seedMany("education", (rows) => prisma.education.createMany({ data: rows }), education);
  } else {
    console.log("[seed] education: source key missing  -  left unchanged.");
  }

  // --- Projects -------------------------------------------------------------
  if (has("projects")) {
    await prisma.project.deleteMany({});
    const projects = asArray(data.projects)
      .filter(isObject)
      .map((p) => ({
        title: requiredStr(p.title) as string,
        description: requiredStr(p.description) as string,
        techList: toArray(p.techList),
        github: str(p.github),
        liveUrl: str(p.liveUrl),
        sortOrder: 0,
      }))
      .filter((p) => p.title && p.description)
      .map((p, i) => ({ ...p, sortOrder: i }));
    await seedMany("projects", (rows) => prisma.project.createMany({ data: rows }), projects);
  } else {
    console.log("[seed] projects: source key missing  -  left unchanged.");
  }

  // --- Technologies ---------------------------------------------------------
  if (has("technologies")) {
    await prisma.technology.deleteMany({});
    const technologies = asArray(data.technologies)
      .filter(isObject)
      .map((t) => ({
        title: requiredStr(t.title) as string,
        icon: str(t.icon),
        category: str(t.category) ?? "Other",
        sortOrder: 0,
      }))
      .filter((t) => t.title)
      .map((t, i) => ({ ...t, sortOrder: i }));
    await seedMany(
      "technologies",
      (rows) => prisma.technology.createMany({ data: rows }),
      technologies,
    );
  } else {
    console.log("[seed] technologies: source key missing  -  left unchanged.");
  }

  // --- Skills ---------------------------------------------------------------
  if (has("skills")) {
    await prisma.skill.deleteMany({});
    const skills = asArray(data.skills)
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .map((title, i) => ({ title, sortOrder: i }));
    await seedMany("skills", (rows) => prisma.skill.createMany({ data: rows }), skills);
  } else {
    console.log("[seed] skills: source key missing  -  left unchanged.");
  }

  // --- Interests ------------------------------------------------------------
  if (has("interests")) {
    await prisma.interest.deleteMany({});
    const interests = asArray(data.interests)
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean)
      .map((title, i) => ({ title, sortOrder: i }));
    await seedMany("interests", (rows) => prisma.interest.createMany({ data: rows }), interests);
  } else {
    console.log("[seed] interests: source key missing  -  left unchanged.");
  }

  // --- Languages ------------------------------------------------------------
  // Each entry may be "Name - Proficiency" or a { name, proficiency } object.
  if (has("languages")) {
    await prisma.language.deleteMany({});
    const languages = asArray(data.languages)
      .map((entry) => {
        if (typeof entry === "string") {
          const [name, ...rest] = entry.split(" - ");
          return { name: name.trim(), proficiency: rest.join(" - ").trim() || null };
        }
        if (isObject(entry)) {
          return { name: str(entry.name) ?? "", proficiency: str(entry.proficiency) };
        }
        return { name: "", proficiency: null };
      })
      .filter((l) => l.name.length > 0)
      .map((l, i) => ({ ...l, sortOrder: i }));
    await seedMany("languages", (rows) => prisma.language.createMany({ data: rows }), languages);
  } else {
    console.log("[seed] languages: source key missing  -  left unchanged.");
  }

  console.log("[seed] content seed complete.");
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
