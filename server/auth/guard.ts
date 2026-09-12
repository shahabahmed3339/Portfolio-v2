import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/authOptions";
import { prisma } from "@/server/db/client";

/** Returns the current session, or null. */
export function getSession() {
  return getServerSession(authOptions);
}

/** Guard for API routes: returns a 401 response when unauthenticated. */
export async function requireSession(): Promise<
  { session: Session } | { response: NextResponse }
> {
  const session = await getSession();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  return { session };
}

export async function recordAudit(
  action: string,
  resource?: string,
  metadata?: Record<string, unknown>,
  userId?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        resource,
        metadata: metadata ? (metadata as object) : undefined,
      },
    });
  } catch {
    // auditing must never break the request
  }
}
