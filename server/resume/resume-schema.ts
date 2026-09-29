import { z } from "zod";

/**
 * The canonical resume shape.
 *
 * Derived directly from the top-level keys of `src/data.js`, which is the
 * source of truth for the portfolio. Everything the site renders and everything
 * `exportResumePdf` consumes is described here, so a tailored resume produced by
 * the AI can be validated before it is ever written to the database or handed to
 * the public site.
 *
 * The shape is intentionally permissive about *optional* fields (matching how
 * `data.js` omits keys rather than setting them to null) but strict about the
 * structure of the required ones, so a malformed AI response is rejected instead
 * of silently rendering a broken portfolio.
 */

/** `head.links[]` */
export const resumeLinkSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  icon: z.string().optional().default(""),
});

/** `head` */
export const resumeHeadSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  totalExperience: z.number().int().nonnegative(),
  profile: z.string().optional().default(""),
  location: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  linkedIn: z.string().optional().default(""),
  github: z.string().optional().default(""),
  portfolio: z.string().optional().default(""),
  links: z.array(resumeLinkSchema).optional().default([]),
});

/** `experience[]` */
export const resumeExperienceSchema = z.object({
  image: z.string().nullable().optional().default(null),
  title: z.string().min(1),
  company: z.string().min(1),
  description: z.string().nullable().optional().default(null),
  location: z.string().nullable().optional().default(null),
  start: z.string().min(1),
  end: z.string().nullable().optional().default(null),
  accomplishments: z.array(z.string()).optional().default([]),
});

/** `education[]` */
export const resumeEducationSchema = z.object({
  image: z.string().nullable().optional().default(null),
  title: z.string().min(1),
  institute: z.string().min(1),
  location: z.string().nullable().optional().default(null),
  start: z.string().min(1),
  end: z.string().nullable().optional().default(null),
  cgpa: z.string().nullable().optional().default(null),
  thesis: z.string().nullable().optional().default(null),
});

/** `projects[]` */
export const resumeProjectSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  techList: z.array(z.string()).optional().default([]),
  github: z.string().nullable().optional().default(null),
  liveUrl: z.string().nullable().optional().default(null),
});

/** `technologies[]` */
export const resumeTechnologySchema = z.object({
  title: z.string().min(1),
  icon: z.string().optional(),
  category: z.string().optional().default("Other"),
});

/**
 * The full resume document.
 *
 * `about`, `skills`, `interests` and `languages` mirror `data.js` exactly:
 * `about` is an array of paragraphs, the rest are flat lists of strings.
 */
export const resumeSchema = z.object({
  backgroundVideo: z.string().optional().default(""),
  resume: z.string().optional().default(""),
  head: resumeHeadSchema,
  about: z.array(z.string()).default([]),
  experience: z.array(resumeExperienceSchema).default([]),
  education: z.array(resumeEducationSchema).default([]),
  projects: z.array(resumeProjectSchema).default([]),
  technologies: z.array(resumeTechnologySchema).default([]),
  skills: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});

export type Resume = z.infer<typeof resumeSchema>;
export type ResumeHead = z.infer<typeof resumeHeadSchema>;
export type ResumeExperience = z.infer<typeof resumeExperienceSchema>;
export type ResumeEducation = z.infer<typeof resumeEducationSchema>;
export type ResumeProject = z.infer<typeof resumeProjectSchema>;
export type ResumeTechnology = z.infer<typeof resumeTechnologySchema>;

/**
 * The slice of the resume the AI is trusted to rewrite.
 *
 * Identity and assets (name, contact details, images, links) are deliberately
 * excluded: the tailoring step may re-emphasise content but must never be able
 * to change who the resume belongs to or point assets somewhere new. The server
 * splices the canonical `head` and asset fields back in after validation, so
 * those values are guaranteed byte-identical to `src/data.js`.
 */
export const resumeTailorOutputSchema = resumeSchema.pick({
  about: true,
  experience: true,
  education: true,
  projects: true,
  technologies: true,
  skills: true,
  interests: true,
  languages: true,
});

export type ResumeTailorOutput = z.infer<typeof resumeTailorOutputSchema>;

/**
 * A stable, human-readable summary of the schema handed to Gemini as part of
 * the prompt. Kept next to the schema so the two cannot drift apart.
 */
export const RESUME_SHAPE_DESCRIPTION = `{
  "about": string[],                      // 2-4 paragraph professional summary
  "experience": [                         // most recent first; keep every entry
    {
      "title": string,                    // job title - must not be invented
      "company": string,                  // employer - must not be invented
      "description": string | null,       // one-line context (industry/domain)
      "location": string | null,
      "start": string,                    // e.g. "Mar 2026" - must not change
      "end": string | null,               // e.g. "Aug 2026" or null if current
      "accomplishments": string[]         // bullet points, reworded for relevance
    }
  ],
  "education": [
    { "title": string, "institute": string, "location": string | null,
      "start": string, "end": string | null, "cgpa": string | null, "thesis": string | null }
  ],
  "projects": [
    { "title": string, "description": string, "techList": string[],
      "github": string | null, "liveUrl": string | null }
  ],
  "technologies": [
    { "title": string, "category": string }   // icon is managed separately
  ],
  "skills": string[],
  "interests": string[],
  "languages": string[]                     // e.g. "English - Professional"
}`;