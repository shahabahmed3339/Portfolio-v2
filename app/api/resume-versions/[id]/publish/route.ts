import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession, recordAudit } from "@/server/auth/guard";
import { publishResumeVersion, unpublishResumeVersion } from "@/server/services/resume.service";

export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["publish", "unpublish"]),
});

/**
 * Publishes or unpublishes a single resume version.
 *
 * Publishing is always an explicit admin action; generation never publishes.
 * Unpublishing the currently active version returns the portfolio to the
 * canonical resume.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "action must be either 'publish' or 'unpublish'" },
      { status: 400 },
    );
  }

  try {
    const version =
      parsed.data.action === "publish"
        ? await publishResumeVersion(params.id)
        : await unpublishResumeVersion(params.id);

    await recordAudit(
      parsed.data.action === "publish" ? "PUBLISH_RESUME" : "UNPUBLISH_RESUME",
      `resumeVersion:${params.id}`,
      undefined,
      guard.session.user.id,
    );

    return NextResponse.json(version);
  } catch (error) {
    if ((error as Error).message === "Resume version not found") {
      return NextResponse.json({ error: "Resume version not found" }, { status: 404 });
    }
    console.error("[resume-versions] publish action failed:", error);
    return NextResponse.json({ error: "Could not update the resume version" }, { status: 500 });
  }
}