import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { getOwnedGames, PrivateLibraryError } from "@/lib/steam";

export async function GET(req: NextRequest) {
  const { steamId } = await getSession();
  if (!steamId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const games = await getOwnedGames(steamId, { fresh: req.nextUrl.searchParams.has("refresh") });
    return NextResponse.json({ games });
  } catch (err) {
    if (err instanceof PrivateLibraryError) {
      return NextResponse.json({ error: "private" }, { status: 403 });
    }
    console.error(err);
    return NextResponse.json({ error: "steam_unavailable" }, { status: 502 });
  }
}
