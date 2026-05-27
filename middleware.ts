import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { STAFF_GATE_COOKIE, verifyStaffGateToken } from "@/lib/staff-gate";

const PUBLIC_PATHS = ["/login", "/pending-approval", "/onboarding", "/register"];
const STAFF_GATE_API_PATHS = ["/api/staff/gate", "/api/staff/gate-check", "/api/staff/register"];
const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-only-secret-change-me";

export default async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  const token = await getToken({ req, secret: AUTH_SECRET });
  const isAuthed = Boolean(token);
  const isAuthApi = pathname.startsWith("/api/auth");
  const isHealthApi = pathname === "/api/health/db";
  const isStaffGateApi = STAFF_GATE_API_PATHS.includes(pathname);
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isApi = pathname.startsWith("/api");
  const hasStaffGate = verifyStaffGateToken(req.cookies.get(STAFF_GATE_COOKIE)?.value);

  if (isAuthApi || isHealthApi) return NextResponse.next();

  if (!isAuthed && isApi) {
    if (isStaffGateApi) return NextResponse.next();
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (!isAuthed && pathname.startsWith("/register")) {
    if (hasStaffGate) return NextResponse.next();
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("register", "1");
    return NextResponse.redirect(loginUrl);
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
