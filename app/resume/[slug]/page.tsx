import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClientOnlySite } from "@/components/ClientOnlySite";
import { getPublishedResumeBySlug } from "@/server/services/resume.service";
import { resumeSchema } from "@/server/resume/resume-schema";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

/**
 * Public URL for a tailored resume version, e.g. /resume/acme-senior-frontend-developer-v2.
 *
 * Only versions the admin has explicitly published resolve here. Unpublished
 * slugs, the canonical resume, and unknown slugs all return 404 - a tailored
 * resume is never publicly reachable until it is published.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const found = await getPublishedResumeBySlug(params.slug).catch(() => null);
  if (!found) return { title: "Resume not found" };

  const { resume, version } = found;
  return {
    title: `${resume.head.name} — Resume${version.job ? ` for ${version.job.jobTitle}` : ""}`,
    description: resume.head.title,
  };
}

export default async function PublicResumePage({ params }: PageProps) {
  const found = await getPublishedResumeBySlug(params.slug).catch(() => null);
  if (!found) notFound();

  const parsed = resumeSchema.safeParse(found.resume);
  if (!parsed.success) notFound();

  // Reuse the exact public portfolio shell so a tailored resume renders
  // identically to the default one.
  return <ClientOnlySite data={parsed.data} />;
}