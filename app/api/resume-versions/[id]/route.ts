import { NextResponse } from "next/server";
import { requireSession, recordAudit } from "@/server/auth/guard";
import {
  deleteResumeVersion,
  getResumeVersion,
  updateResumeVersion,
} from "@/server/services/resume.service";

export const dynamic = "force-dynamic";

/** Full resume version including its document, for the admin editor. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  try {
    const version = await getResumeVersion(params.id);
    if (!version) return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    return NextResponse.json(version);
  } catch (error) {
    console.error("[resume-versions] detail failed:", error);
    return NextResponse.json({ error: "Could not load the resume version" }, { status: 500 });
  }
}

/**
 * Replaces the stored document of a tailored resume version.
 *
 * The body is the resume document itself (not wrapped), so the admin editor can
 * PUT exactly what it loaded. Validation happens in the service layer.
 */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const version = await updateResumeVersion(params.id, body);
    await recordAudit("UPDATE_RESUME_VERSION", `resumeVersion:${params.id}`, undefined, guard.session.user.id);
    return NextResponse.json(version);
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Resume version not found") {
      return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    }
    if (message === "The canonical resume cannot be edited here") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.startsWith("Refusing to save an invalid resume document")) {
      return NextResponse.json({ error: "The resume document is not valid" }, { status: 400 });
    }
    console.error("[resume-versions] update failed:", error);
    return NextResponse.json({ error: "Could not update the resume version" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  try {
    await deleteResumeVersion(params.id);
    await recordAudit("DELETE_RESUME_VERSION", `resumeVersion:${params.id}`, undefined, guard.session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = (error as Error).message;
    if (message === "Resume version not found") {
      return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    }
    if (message === "The canonical resume cannot be deleted") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[resume-versions] delete failed:", error);
    return NextResponse.json({ error: "Could not delete the resume version" }, { status: 500 });
  }
}
