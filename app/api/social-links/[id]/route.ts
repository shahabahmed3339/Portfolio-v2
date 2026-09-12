import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { recordAudit, requireSession } from "@/server/auth/guard";
import { socialLinkSchema } from "@/server/api/schemas";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const parsed = socialLinkSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.socialLink.update({ where: { id: params.id }, data: parsed.data });
  await recordAudit("UPDATE_SOCIAL_LINK", `socialLink:${params.id}`, undefined, guard.session.user.id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  await prisma.socialLink.delete({ where: { id: params.id } });
  await recordAudit("DELETE_SOCIAL_LINK", `socialLink:${params.id}`, undefined, guard.session.user.id);
  return NextResponse.json({ ok: true });
}
