import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/guard";
import { listAllResumeVersions } from "@/server/services/resume.service";
import { isAiConfigured, describeAiConfiguration, missingKeyMessage } from "@/server/ai/ai-client";

export const dynamic = "force-dynamic";

/** Every tailored resume version across all jobs, plus AI provider config status. */
export async function GET() {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  try {
    const versions = await listAllResumeVersions();
    return NextResponse.json({
      versions,
      aiConfigured: isAiConfigured(),
      // Admin-facing description of the active providers, e.g. "Gemini (gemini-3.8-flash)".
      aiConfiguration: describeAiConfiguration(),
      aiMissingKeyMessage: isAiConfigured() ? null : missingKeyMessage(),
    });
  } catch (error) {
    console.error("[resume-versions] list failed:", error);
    return NextResponse.json({ error: "Could not load resume versions" }, { status: 500 });
  }
}