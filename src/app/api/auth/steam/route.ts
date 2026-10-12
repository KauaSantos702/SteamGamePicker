import { NextResponse, type NextRequest } from "next/server";
import { appUrl, buildLoginUrl } from "@/lib/steam";

export function GET(req: NextRequest) {
  return NextResponse.redirect(buildLoginUrl(appUrl(req.nextUrl.origin)));
}
