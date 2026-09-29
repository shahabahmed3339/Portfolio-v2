import { NextResponse } from "next/server";
import { requireSession, recordAudit } from "@/server/auth/guard";
import { resetActiveResumeToCanonical } from "@/server/services/resume.service";

export const dynamic = "force-dynamic";

/**
 * Returns the public portfolio to the canonical resume from src/data.js,
 * clearing whatever tailored resume was active.
 */
export async function POST() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  try {
    await resetActiveResumeToCanonical();
    await recordAudit("RESET_ACTIVE_RESUME", "resume:canonical", undefined, guard.session.user.id);
    return NextResponse.json({ ok: true, active: "canonical" });
  } catch (error) {
    console.error("[resume-versions] reset failed:", error);
    return NextResponse.json({ error: "Could not reset the active resume" }, { status: 500 });
  }
}