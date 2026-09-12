import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { ensureProfile } from "@/server/services/content.service";
import { recordAudit, requireSession } from "@/server/auth/guard";
import { socialLinkSchema } from "@/server/api/schemas";

export async function GET() {
  const links = await prisma.socialLink.findMany({ orderBy: [{ sortOrder: "asc" }] });
  return NextResponse.json(links);
}

export async function POST(req: Request) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const parsed = socialLinkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await ensureProfile();
  const created = await prisma.socialLink.create({
    data: { ...parsed.data, profileId: profile.id },
  });
  await recordAudit("CREATE_SOCIAL_LINK", `socialLink:${created.id}`, undefined, guard.session.user.id);
  return NextResponse.json(created, { status: 201 });
}
