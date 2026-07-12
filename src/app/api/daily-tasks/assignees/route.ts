import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { canManageOthersTasks } from "@/lib/daily-task-access";
import { he } from "@/lib/i18n/he";
import { prisma } from "@/lib/db";
import { approvedBranchMembershipWhere } from "@/lib/user-branches";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }
    if (!canManageOthersTasks(user.role)) {
      return NextResponse.json({ ok: false, error: he.dailyTasks.forbidden }, { status: 403 });
    }

    const branchId = await getViewBranchId(user);
    if (!branchId) {
      return NextResponse.json({ ok: true, assignees: [] });
    }

    const assignees = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...approvedBranchMembershipWhere(branchId),
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({ ok: true, assignees });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: he.dailyTasks.assigneeLoadFailed }, { status: 500 });
  }
}
