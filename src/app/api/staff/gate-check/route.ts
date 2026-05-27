import { NextRequest, NextResponse } from "next/server";
import { STAFF_GATE_COOKIE, verifyStaffGateToken } from "@/lib/staff-gate";

export async function GET(req: NextRequest) {
  const gateToken = req.cookies.get(STAFF_GATE_COOKIE)?.value;
  if (!verifyStaffGateToken(gateToken)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
