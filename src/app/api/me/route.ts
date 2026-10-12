import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPlayerSummary } from "@/lib/steam";

export async function GET() {
  const { steamId } = await getSession();
  if (!steamId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const profile = await getPlayerSummary(steamId);
  return NextResponse.json({ steamId, profile }, { headers: { "Cache-Control": "private, no-store" } });
}
