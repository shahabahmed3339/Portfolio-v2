import { getActiveResume } from "@/server/services/resume.service";
import { getCanonicalResume } from "@/server/resume/canonical-resume";
import type { Resume } from "@/server/resume/resume-schema";

/**
 * Public entry point for "what resume should the portfolio show right now?".
 *
 *   an explicitly published tailored resume exists -> that resume
 *   otherwise                                      -> the canonical resume
 *
 * This is the only function the public site needs to call. It never throws:
 * if anything goes wrong (database unreachable, schema drift, no active
 * version) it returns the canonical resume read straight from src/data.js, so
 * the portfolio keeps working exactly as it did before this feature existed.
 */
export async function getActiveResumeForPortfolio(): Promise<Resume> {
  try {
    const { resume } = await getActiveResume();
    return resume;
  } catch (error) {
    console.error("[resume] active resume resolution failed; using canonical resume.", error);
    return getCanonicalResume();
  }
}

export { getActiveResume };
export type { ActiveResume } from "@/server/services/resume.service";