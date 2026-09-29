import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getCanonicalResume, getCanonicalResumeJson } from "@/server/resume/canonical-resume";
import { resumeSchema, type Resume } from "@/server/resume/resume-schema";
import { jobSlugBase, resumeVersionSlugBase, uniqueSlug } from "@/server/resume/slug";

/**
 * Resume versioning, publishing and resolution.
 *
 * Design rules enforced here:
 *
 *  - The canonical resume (from src/data.js) is never modified. It is mirrored
 *    into a `ResumeVersion` row with `jobId = NULL` purely so the admin UI has a
 *    stable identity to reference; the file remains the source of truth and the
 *    mirror is refreshed on demand.
 *  - Generating again NEVER overwrites an existing version. A new row with
 *    version = max + 1 is always created.
 *  - Generating does NOT publish. Publishing is an explicit, separate action.
 *  - The active resume falls back to the canonical resume whenever nothing has
 *    been explicitly published, so introducing this feature cannot change the
 *    public portfolio by itself.
 */

export const ACTIVE_RESUME_SETTING_KEY = "activeResumeVersionId";
export const CANONICAL_SLUG = "canonical";
export const CANONICAL_STATUS = "CANONICAL";

export type ResumeVersionStatus = "CANONICAL" | "GENERATED" | "DRAFT" | "FAILED";

/** Shape returned to the admin UI. `resumeJson` is omitted from list views. */
export interface ResumeVersionSummary {
  id: string;
  jobId: string | null;
  version: number;
  slug: string;
  status: string;
  isPublished: boolean;
  model: string | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Canonical resume mirror
// ---------------------------------------------------------------------------

/**
 * Ensures a `ResumeVersion` row exists for the canonical resume and that its
 * JSON matches the current contents of `src/data.js`.
 *
 * This is the only row whose `jobId` is NULL. It is refreshed (not recreated)
 * whenever the source file changes, so a redeploy with edited data is picked up
 * without accumulating duplicate canonical rows.
 */
export async function ensureCanonicalResumeVersion() {
  const canonicalJson = await getCanonicalResumeJson();

  const existing = await prisma.resumeVersion.findFirst({ where: { jobId: null } });

  if (existing) {
    const current = JSON.stringify(existing.resumeJson);
    const next = JSON.stringify(canonicalJson);
    if (current === next && existing.status === CANONICAL_STATUS) return existing;

    return prisma.resumeVersion.update({
      where: { id: existing.id },
      data: { resumeJson: canonicalJson as Prisma.InputJsonValue, status: CANONICAL_STATUS },
    });
  }

  const slug = await uniqueSlug(CANONICAL_SLUG, async (candidate: string) => {
    const hit = await prisma.resumeVersion.findUnique({ where: { slug: candidate } });
    return Boolean(hit);
  });

  return prisma.resumeVersion.create({
    data: {
      jobId: null,
      resumeJson: canonicalJson as Prisma.InputJsonValue,
      status: CANONICAL_STATUS,
      version: 1,
      slug,
      isPublished: false,
      source: "src/data.js",
    },
  });
}

// ---------------------------------------------------------------------------
// Version listing
// ---------------------------------------------------------------------------

/** All resume versions for a job, newest version first. */
export async function listResumeVersionsForJob(jobId: string): Promise<ResumeVersionSummary[]> {
  const rows = await prisma.resumeVersion.findMany({
    where: { jobId },
    orderBy: [{ version: "desc" }],
  });
  const activeId = await getActiveResumeVersionId();
  return rows.map((row) => toSummary(row, activeId));
}

/** Every tailored resume version, newest first, with its job attached. */
export async function listAllResumeVersions() {
  const [rows, activeId] = await Promise.all([
    prisma.resumeVersion.findMany({
      where: { jobId: { not: null } },
      orderBy: [{ createdAt: "desc" }],
      include: { job: { select: { id: true, companyName: true, jobTitle: true, slug: true } } },
    }),
    getActiveResumeVersionId(),
  ]);

  return rows.map((row) => ({
    ...toSummary(row, activeId),
    job: row.job,
  }));
}

function toSummary(row: any, activeId: string | null): ResumeVersionSummary {
  return {
    id: row.id,
    jobId: row.jobId,
    version: row.version,
    slug: row.slug,
    status: row.status,
    isPublished: row.isPublished,
    model: row.model ?? null,
    source: row.source ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isActive: activeId !== null && activeId === row.id,
  };
}

/** Full row including the resume JSON, for preview and public rendering. */
export async function getResumeVersion(id: string) {
  return prisma.resumeVersion.findUnique({ where: { id } });
}

// ---------------------------------------------------------------------------
// Creating new versions
// ---------------------------------------------------------------------------

/**
 * Persists a newly tailored resume as the next version for the job.
 *
 * Never mutates an existing version: the version number is derived from the
 * current maximum and the row is always an insert.
 */
export async function createResumeVersion(params: {
  jobId: string;
  companyName: string;
  jobTitle: string;
  resumeJson: unknown;
  model?: string | null;
  promptVersion?: string | null;
  status?: ResumeVersionStatus;
}) {
  const { jobId, companyName, jobTitle, resumeJson } = params;

  // Validate once more at the persistence boundary: nothing reaches the
  // database unless it is a structurally valid resume.
  const parsed = resumeSchema.safeParse(resumeJson);
  if (!parsed.success) {
    throw new Error(
      `Refusing to save an invalid resume document: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const latest = await prisma.resumeVersion.findFirst({
    where: { jobId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const slug = await uniqueSlug(
    resumeVersionSlugBase(companyName, jobTitle, nextVersion),
    (candidate: string) =>
      prisma.resumeVersion.findUnique({ where: { slug: candidate } }).then(Boolean),
  );

  return prisma.resumeVersion.create({
    data: {
      jobId,
      resumeJson: parsed.data as unknown as Prisma.InputJsonValue,
      status: params.status ?? "GENERATED",
      version: nextVersion,
      slug,
      // Newly generated resumes are deliberately NOT published.
      isPublished: false,
      model: params.model ?? null,
      source: params.promptVersion ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Publishing / active resume
// ---------------------------------------------------------------------------

async function getActiveResumeVersionId(): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key: ACTIVE_RESUME_SETTING_KEY } });
  if (!setting) return null;
  const value = setting.value as { versionId?: unknown } | null;
  return typeof value?.versionId === "string" ? value.versionId : null;
}

/** The explicit "live" resume version, or null when the canonical resume is live. */
export async function getActiveResumeVersion() {
  const activeId = await getActiveResumeVersionId();
  if (!activeId) return null;
  return prisma.resumeVersion.findUnique({ where: { id: activeId } });
}

/**
 * Marks a version as the one the public portfolio should display.
 *
 * `isPublished` on the version controls whether its own /resume/<slug> URL is
 * reachable; the AppSetting controls which document the portfolio renders.
 * Publishing a version sets both, so "Publish" is a single, obvious action.
 */
export async function publishResumeVersion(id: string) {
  const version = await prisma.resumeVersion.findUnique({ where: { id } });
  if (!version) throw new Error("Resume version not found");

  await prisma.$transaction([
    prisma.resumeVersion.update({ where: { id }, data: { isPublished: true } }),
    prisma.appSetting.upsert({
      where: { key: ACTIVE_RESUME_SETTING_KEY },
      create: { key: ACTIVE_RESUME_SETTING_KEY, value: { versionId: id } },
      update: { value: { versionId: id } },
    }),
  ]);

  return prisma.resumeVersion.findUnique({ where: { id } });
}

/** Removes a version's public URL. Does not affect the canonical resume. */
export async function unpublishResumeVersion(id: string) {
  const version = await prisma.resumeVersion.findUnique({ where: { id } });
  if (!version) throw new Error("Resume version not found");

  await prisma.resumeVersion.update({ where: { id }, data: { isPublished: false } });

  // If this version was the active one, clear the pointer so the portfolio
  // falls back to the canonical resume rather than to nothing.
  const activeId = await getActiveResumeVersionId();
  if (activeId === id) {
    await prisma.appSetting.deleteMany({ where: { key: ACTIVE_RESUME_SETTING_KEY } });
  }

  return prisma.resumeVersion.findUnique({ where: { id } });
}

/** Explicitly returns the public portfolio to the canonical resume. */
export async function resetActiveResumeToCanonical() {
  await prisma.appSetting.deleteMany({ where: { key: ACTIVE_RESUME_SETTING_KEY } });
}

// ---------------------------------------------------------------------------
// Resolution used by the public site
// ---------------------------------------------------------------------------

export interface ActiveResume {
  /** The document the public portfolio should render. */
  resume: Resume;
  /** "canonical" when the default resume is live, otherwise "version". */
  kind: "canonical" | "version";
  versionId: string | null;
  slug: string | null;
}

/**
 * Resolves which resume the public portfolio should display.
 *
 *   published tailored resume exists -> that resume
 *   otherwise                        -> the canonical resume from src/data.js
 *
 * Deliberately fails soft: if the active version's stored JSON no longer parses
 * (e.g. schema drift after a deploy), the canonical resume is used instead of
 * breaking the public site.
 */
export async function getActiveResume(): Promise<ActiveResume> {
  const canonical = await getCanonicalResume();

  try {
    const active = await getActiveResumeVersion();
    if (active) {
      const parsed = resumeSchema.safeParse(active.resumeJson);
      if (parsed.success) {
        return {
          resume: parsed.data,
          kind: "version",
          versionId: active.id,
          slug: active.slug,
        };
      }
      console.error(
        `[resume] active version ${active.id} failed schema validation; falling back to canonical.`,
      );
    }
  } catch (error) {
    console.error("[resume] failed to resolve active resume; using canonical.", error);
  }

  return { resume: canonical, kind: "canonical", versionId: null, slug: null };
}

// ---------------------------------------------------------------------------
// Public lookup by slug
// ---------------------------------------------------------------------------

/**
 * Looks up a resume version by its public slug.
 *
 * Only published versions are returned, and the canonical resume is never
 * reachable by slug - it is served at the root portfolio only.
 */
export async function getPublishedResumeBySlug(slug: string) {
  const row = await prisma.resumeVersion.findUnique({
    where: { slug },
    include: { job: { select: { companyName: true, jobTitle: true } } },
  });

  if (!row || !row.isPublished || row.jobId === null) return null;

  const parsed = resumeSchema.safeParse(row.resumeJson);
  if (!parsed.success) return null;

  return { version: row, resume: parsed.data };
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export interface JobInput {
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  jobUrl?: string | null;
  location?: string | null;
  notes?: string | null;
}

export async function createJob(input: JobInput) {
  const slug = await uniqueSlug(jobSlugBase(input.companyName, input.jobTitle), (candidate: string) =>
    prisma.job.findUnique({ where: { slug: candidate } }).then(Boolean),
  );

  return prisma.job.create({
    data: {
      companyName: input.companyName,
      jobTitle: input.jobTitle,
      jobDescription: input.jobDescription,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      jobUrl: input.jobUrl ?? null,
      location: input.location ?? null,
      notes: input.notes ?? null,
      slug,
    },
  });
}

/**
 * Updates a job. The slug is intentionally left untouched on rename so that
 * previously shared resume URLs keep resolving.
 */
export async function updateJob(id: string, input: Partial<JobInput> & { isArchived?: boolean }) {
  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) throw new Error("Job not found");

  return prisma.job.update({
    where: { id },
    data: {
      companyName: input.companyName ?? undefined,
      jobTitle: input.jobTitle ?? undefined,
      jobDescription: input.jobDescription ?? undefined,
      contactName: input.contactName === undefined ? undefined : input.contactName,
      contactEmail: input.contactEmail === undefined ? undefined : input.contactEmail,
      contactPhone: input.contactPhone === undefined ? undefined : input.contactPhone,
      jobUrl: input.jobUrl === undefined ? undefined : input.jobUrl,
      location: input.location === undefined ? undefined : input.location,
      notes: input.notes === undefined ? undefined : input.notes,
      isArchived: input.isArchived ?? undefined,
    },
  });
}

export async function listJobs(includeArchived = false) {
  return prisma.job.findMany({
    where: includeArchived ? undefined : { isArchived: false },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { resumeVersions: true } } },
  });
}

export async function getJob(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: {
      resumeVersions: { orderBy: { version: "desc" }, select: { id: true, version: true, slug: true, isPublished: true, status: true, createdAt: true } },
    },
  });
}

export async function deleteJob(id: string) {
  // Resume versions cascade via the foreign key.
  return prisma.job.delete({ where: { id } });
}