import { NextResponse } from "next/server";
import {
  createStaffGateToken,
  staffGateCookieOptions,
  STAFF_GATE_COOKIE,
  verifyStaffGateCredentials,
} from "@/lib/staff-gate";
import { he } from "@/lib/i18n/he";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.toString().trim().toLowerCase() ?? "";
  const password = body?.password?.toString() ?? "";

  if (!verifyStaffGateCredentials(email, password)) {
    return NextResponse.json({ ok: false, error: he.staffGate.invalidGate }, { status: 401 });
  }

  const token = createStaffGateToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_GATE_COOKIE, token, staffGateCookieOptions());
  return res;
}
