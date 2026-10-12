import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/steam";

export async function POST(req: NextRequest) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(`${appUrl(req.nextUrl.origin)}/`, 303);
}
