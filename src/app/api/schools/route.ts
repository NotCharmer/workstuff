import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCHOOL_CODES } from "@/lib/schools";
import { getViewBranchId } from "@/lib/branch-scope";
import { getUserAccessibleBranchIds, userCanSwitchBranches } from "@/lib/user-branches";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const activeBranchId = await getViewBranchId(user);
    const accessibleIds =
      user.role === "ADMIN" ? [] : await getUserAccessibleBranchIds(user.id);

    const branchWhere =
      user.role === "ADMIN"
        ? { code: { in: [...SCHOOL_CODES] } }
        : accessibleIds.length > 0
          ? { id: { in: accessibleIds } }
          : { id: user.branchId ?? "__none__" };

    const branches = await prisma.branch.findMany({
      where: branchWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        _count: { select: { students: true } },
      },
    });

    const canSwitch = await userCanSwitchBranches(user.id, user.role);

    return NextResponse.json({
      ok: true,
      branches,
      activeBranchId,
      canSwitch,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load schools" }, { status: 500 });
  }
}
