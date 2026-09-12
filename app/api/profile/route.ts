import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { ensureProfile } from "@/server/services/content.service";
import { recordAudit, requireSession } from "@/server/auth/guard";

const profileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  totalExperience: z.coerce.number().int().min(0).optional(),
  profile: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  linkedIn: z.string().nullable().optional(),
  github: z.string().nullable().optional(),
  portfolio: z.string().nullable().optional(),
  backgroundVideo: z.string().nullable().optional(),
  resume: z.string().nullable().optional(),
});

export async function GET() {
  const profile = await ensureProfile();
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const guard = await requireSession();
  if ("response" in guard) return guard.response;

  const parsed = profileUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await ensureProfile();
  const updated = await prisma.profile.update({ where: { id: profile.id }, data: parsed.data });
  await recordAudit("UPDATE_PROFILE", `profile:${profile.id}`, undefined, guard.session.user.id);
  return NextResponse.json(updated);
}
