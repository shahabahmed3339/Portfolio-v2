import { NextResponse } from "next/server";
import { requireSession, recordAudit } from "@/server/auth/guard";
import { deleteJob, getJob, listResumeVersionsForJob, updateJob } from "@/server/services/resume.service";
import { jobUpdateSchema } from "@/server/api/job-schemas";

export const dynamic = "force-dynamic";

/** Job details plus its resume versions. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  try {
    const job = await getJob(params.id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const versions = await listResumeVersionsForJob(job.id);
    return NextResponse.json({ ...job, resumeVersions: versions });
  } catch (error) {
    console.error("[jobs] detail failed:", error);
    return NextResponse.json({ error: "Could not load the job" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  // Partial update: only the fields present in the payload are validated.
  const parsed = jobUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid job details", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const job = await updateJob(params.id, parsed.data);
    await recordAudit("UPDATE_JOB", `job:${job.id}`, undefined, guard.session.user.id);
    return NextResponse.json(job);
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Job not found") {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    console.error("[jobs] update failed:", error);
    return NextResponse.json({ error: "Could not update the job" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  try {
    const job = await getJob(params.id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    await deleteJob(params.id);
    await recordAudit("DELETE_JOB", `job:${params.id}`, undefined, guard.session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[jobs] delete failed:", error);
    return NextResponse.json({ error: "Could not delete the job" }, { status: 500 });
  }
}