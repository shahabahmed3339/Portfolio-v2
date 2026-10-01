import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ClientOnlySite } from "@/components/ClientOnlySite";
import { getResumeVersionBySlug } from "@/server/services/resume.service";
import { resumeSchema } from "@/server/resume/resume-schema";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

/**
 * Public URL for a tailored resume version, e.g. /<jobId>.
 *
 * Every tailored version resolves here as soon as it is generated, so a resume
 * can be shared before it is chosen as the portfolio's default. Only the
 * canonical resume and unknown slugs return 404.
 *
 * This is a top-level catch-all segment: it sits alongside the fixed routes
 * (/admin, /login, /api) which Next resolves first because static segments take
 * precedence over a dynamic one.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const found = await getResumeVersionBySlug(params.slug).catch(() => null);
  if (!found) return { title: "Resume not found" };

  const { resume, version } = found;
  return {
    title: `${resume.head.name} — Resume${version.job ? ` for ${version.job.jobTitle}` : ""}`,
    description: resume.head.title,
  };
}

export default async function PublicResumePage({ params }: PageProps) {
  const found = await getResumeVersionBySlug(params.slug).catch(() => null);
  if (!found) notFound();

  const parsed = resumeSchema.safeParse(found.resume);
  if (!parsed.success) notFound();

  // Reuse the exact public portfolio shell so a tailored resume renders
  // identically to the default one.
  return <ClientOnlySite data={parsed.data} />;
}