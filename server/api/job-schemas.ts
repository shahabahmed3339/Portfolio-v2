import { z } from "zod";

/**
 * Validation schemas for the jobs admin API.
 *
 * Kept outside `app/api/jobs/route.ts` because Next.js route files may only
 * export HTTP method handlers and route config - exporting a schema from a
 * route module fails the production build.
 */

export const jobSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  jobDescription: z.string().trim().min(1, "Job description is required"),
  contactName: z.string().trim().nullable().optional(),
  contactEmail: z.string().trim().nullable().optional(),
  contactPhone: z.string().trim().nullable().optional(),
  jobUrl: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

/** Partial schema for edits; `isArchived` drives archive/restore. */
export const jobUpdateSchema = jobSchema
  .partial()
  .extend({ isArchived: z.boolean().optional() });

export type JobPayload = z.infer<typeof jobSchema>;