import { NextResponse } from "next/server";
import { ensureProfile, getPortfolioData } from "@/server/services/content.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getPortfolioData();
    return NextResponse.json(data);
  } catch (error) {
    // If the content tables are empty, make sure a profile exists so the
    // site still has something to render.
    await ensureProfile().catch(() => undefined);
    return NextResponse.json(
      { error: "Failed to load portfolio", detail: (error as Error).message },
      { status: 500 },
    );
  }
}
