import { NextResponse, type NextRequest } from "next/server";
import { getSiteEnv } from "@/lib/env";

// Simple HTTP Basic Auth gate for this personal site — not a real user
// system, just a shared password per the spec ("it's personal").
export function middleware(request: NextRequest): NextResponse {
  const authHeader = request.headers.get("authorization");
  const { SITE_PASSWORD } = getSiteEnv();

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const password = separatorIndex >= 0 ? decoded.slice(separatorIndex + 1) : "";
    if (password === SITE_PASSWORD) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Job Radar"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
