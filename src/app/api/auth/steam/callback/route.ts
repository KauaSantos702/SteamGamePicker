import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { appUrl, verifyLogin } from "@/lib/steam";

export async function GET(req: NextRequest) {
  const base = appUrl(req.nextUrl.origin);
  const steamId = await verifyLogin(req.nextUrl.searchParams, base).catch(() => null);
  if (!steamId) return NextResponse.redirect(`${base}/?erro=login`);

  const session = await getSession();
  session.steamId = steamId;
  await session.save();
  return NextResponse.redirect(`${base}/`);
}
