import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCHOOL_CODES } from "@/lib/schools";
import { getViewBranchId } from "@/lib/branch-scope";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const activeBranchId = await getViewBranchId(user);
    const branches = await prisma.branch.findMany({
      where:
        user.role === "ADMIN"
          ? { code: { in: [...SCHOOL_CODES] } }
          : { id: user.branchId ?? "__none__" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { students: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      branches,
      activeBranchId,
      canSwitch: user.role === "ADMIN",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load schools" }, { status: 500 });
  }
}
