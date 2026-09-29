import { NextResponse } from "next/server";
import { requireSession, recordAudit } from "@/server/auth/guard";
import { createJob, listJobs } from "@/server/services/resume.service";
import { jobSchema } from "@/server/api/job-schemas";

export const dynamic = "force-dynamic";

/** Lists jobs for the admin. Archived jobs are excluded unless ?archived=1. */
export async function GET(req: Request) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const includeArchived = new URL(req.url).searchParams.get("archived") === "1";

  try {
    const jobs = await listJobs(includeArchived);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("[jobs] list failed:", error);
    return NextResponse.json({ error: "Could not load jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const parsed = jobSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid job details", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const job = await createJob(parsed.data);
    await recordAudit("CREATE_JOB", `job:${job.id}`, undefined, guard.session.user.id);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("[jobs] create failed:", error);
    return NextResponse.json({ error: "Could not create the job" }, { status: 500 });
  }
}