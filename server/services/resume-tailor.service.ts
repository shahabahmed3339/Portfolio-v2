import { prisma } from "@/server/db/client";
import { toRootRelativeAsset } from "@/server/assets/asset-path";
import { getCanonicalResume } from "@/server/resume/canonical-resume";
import { resumeSchema, type Resume } from "@/server/resume/resume-schema";
import { TailorError, tailorResumeForJob } from "@/server/ai/ai-client";
import { createResumeVersion } from "./resume.service";

/**
 * Orchestrates the tailoring flow:
 *
 *   validate job -> load canonical resume -> call the AI provider -> validate ->
 *   save a NEW resume version
 *
 * Nothing in here publishes anything, and nothing mutates the canonical resume
 * or any previously generated version.
 */

export interface GenerateResult {
  versionId: string;
  version: number;
  slug: string;
  model: string;
}

/**
 * Tailors a resume for a job and stores it as the next version.
 *
 * Throws `TailorError` (safe to surface to the admin) for every expected
 * failure mode: missing job, missing description, missing API key, upstream
 * errors, and schema mismatches.
 */
export async function generateTailoredResume(jobId: string): Promise<GenerateResult> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new TailorError("INVALID_RESPONSE", "Job not found.");
  }
  if (!job.jobDescription?.trim()) {
    throw new TailorError(
      "INVALID_RESPONSE",
      "This job has no job description. Add one before generating a tailored resume.",
    );
  }

  // Always tailor from the canonical resume - never from a previous tailored
  // version - so relevance tweaks cannot accumulate or compound.
  const canonical = await getCanonicalResume();

  const { output, model, promptVersion } = await tailorResumeForJob({
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    jobDescription: job.jobDescription,
    location: job.location,
    notes: job.notes,
    canonicalResume: canonical,
  });

  // The AI only ever rewrites content. Identity, contact details and asset
  // paths are taken from the canonical resume verbatim, so a tailored resume
  // can never point at different assets or claim a different person.
  const merged: Resume = resumeSchema.parse({
    ...canonical,
    about: output.about.length ? output.about : canonical.about,
    experience: output.experience.length ? output.experience : canonical.experience,
    education: output.education.length ? output.education : canonical.education,
    projects: output.projects.length ? output.projects : canonical.projects,
    skills: output.skills.length ? output.skills : canonical.skills,
    languages: output.languages.length ? output.languages : canonical.languages,
    interests: output.interests.length ? output.interests : canonical.interests,
    // Technology icons are local assets the AI has no knowledge of; carry the
    // canonical icon across by title and keep the AI's ordering/categories.
    // Normalised on the way out because a tailored resume is also served from a
    // versioned URL, where a relative path would resolve to the wrong directory.
    technologies: output.technologies.map((tech) => {
      const canonicalMatch = canonical.technologies.find(
        (t) => t.title.toLowerCase() === tech.title.toLowerCase(),
      );
      return { ...tech, icon: toRootRelativeAsset(canonicalMatch?.icon) };
    }),
  });

  const created = await createResumeVersion({
    jobId: job.id,
    companyName: job.companyName,
    jobTitle: job.jobTitle,
    resumeJson: merged,
    model,
    promptVersion,
  });

  return {
    versionId: created.id,
    version: created.version,
    slug: created.slug,
    model,
  };
}