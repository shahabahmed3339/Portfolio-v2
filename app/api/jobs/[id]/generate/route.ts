import { NextResponse } from "next/server";
import { requireSession, recordAudit } from "@/server/auth/guard";
import { generateTailoredResume } from "@/server/services/resume-tailor.service";
import { TailorError, isAiConfigured, missingKeyMessage } from "@/server/ai/ai-client";

export const dynamic = "force-dynamic";
// Tailoring calls an external API and can take a while.
export const maxDuration = 60;

/**
 * Generates a NEW tailored resume version for a job.
 *
 * Never overwrites an existing version and never publishes the result - the
 * admin must publish explicitly afterwards.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  // Fail fast with a clear configuration message rather than crashing later.
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: missingKeyMessage(), code: "MISSING_API_KEY" },
      { status: 503 },
    );
  }

  try {
    const result = await generateTailoredResume(params.id);
    await recordAudit(
      "GENERATE_RESUME",
      `job:${params.id}`,
      { versionId: result.versionId, version: result.version, model: result.model },
      guard.session.user.id,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof TailorError) {
      // adminMessage is written to be safe to display: no key, no stack trace.
      const status = error.code === "MISSING_API_KEY" ? 503 : error.code === "RATE_LIMITED" ? 429 : 502;
      console.error(`[jobs] generation failed (${error.code}):`, error.message);
      return NextResponse.json({ error: error.adminMessage, code: error.code }, { status });
    }

    console.error("[jobs] generation failed:", error);
    return NextResponse.json(
      { error: "Could not generate a tailored resume. Please try again." },
      { status: 500 },
    );
  }
}