import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

const PUBLIC_PATHS = ["/login", "/pending-approval", "/onboarding"];
const AUTH_SECRET = getAuthSecret();

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;
  const token = await getToken({ req, secret: AUTH_SECRET });
  const isAuthed = Boolean(token);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith("/api");

  if (isAuthApi) return NextResponse.next();

  if (!isAuthed && isApi) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isAuthed && !isPublic) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  const status = String((token as any)?.status ?? "PENDING");
  const onboardingCompleted = Boolean((token as any)?.onboardingCompleted ?? false);

  if (isAuthed && !onboardingCompleted && !pathname.startsWith("/onboarding")) {
    if (isApi && !pathname.startsWith("/api/onboarding")) {
      return NextResponse.json({ ok: false, error: "Onboarding required" }, { status: 403 });
    }
    if (!isApi) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  if (
    isAuthed &&
    onboardingCompleted &&
    status !== "ACTIVE" &&
    !pathname.startsWith("/pending-approval")
  ) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: "Account pending approval" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/pending-approval", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
