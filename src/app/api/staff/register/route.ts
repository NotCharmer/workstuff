import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { StaffRegisterSchema } from "@/lib/validators";
import {
  isReservedStaffGateEmail,
  STAFF_GATE_COOKIE,
  verifyStaffGateToken,
} from "@/lib/staff-gate";
import {
  formatRequestedBranchCodes,
  resolveBranchIdsFromCodes,
} from "@/lib/user-branches";
import { he } from "@/lib/i18n/he";

function gateDenied() {
  return NextResponse.json({ ok: false, error: he.staffGate.gateExpired }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const gateToken = req.cookies.get(STAFF_GATE_COOKIE)?.value;
  if (!verifyStaffGateToken(gateToken)) {
    return gateDenied();
  }

  const body = await req.json().catch(() => null);
  const parsed = StaffRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  if (isReservedStaffGateEmail(email)) {
    return NextResponse.json({ ok: false, error: he.staffGate.reservedEmail }, { status: 400 });
  }

  const branchResult = await resolveBranchIdsFromCodes(parsed.data.branchCodes);
  if (!branchResult.ok) {
    return NextResponse.json({ ok: false, error: he.staffGate.branchNotFound }, { status: 400 });
  }

  const branches = branchResult.branches;
  const primaryBranch = branches[0];
  const passwordHash = await hash(parsed.data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.fullName,
        passwordHash,
        role: "STAFF",
        status: "PENDING",
        branchId: primaryBranch.id,
        requestedBranchCode: formatRequestedBranchCodes(branches.map((b) => b.code)),
        onboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
      },
    });

    const res = NextResponse.json({ ok: true, user }, { status: 201 });
    res.cookies.set(STAFF_GATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: he.staffGate.emailTaken }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: he.staffGate.saveFailed }, { status: 500 });
  }
}
