import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import {
  buildTaskLists,
  canManageOthersTasks,
  resolveCreateAssigneeId,
  resolveScopeForUser,
  taskInclude,
} from "@/lib/daily-task-access";
import { DailyTaskSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const branchId = await getViewBranchId(user);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
    }

    const scope = resolveScopeForUser(user, searchParams.get("scope"));
    const personalAssigneeId = searchParams.get("assigneeId");

    const lists = await buildTaskLists(user, branchId, date, scope, personalAssigneeId);

    return NextResponse.json({
      ok: true,
      ...lists,
      canManage: canManageOthersTasks(user.role),
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "ASSIGNEE_NOT_IN_BRANCH") {
      return NextResponse.json({ ok: false, error: he.dailyTasks.assigneeNotFound }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: he.dailyTasks.toastError }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const branchId = await getViewBranchId(user);
    if (!branchId) {
      return NextResponse.json({ ok: false, error: he.dailyTasks.noBranch }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parsed = DailyTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    const assigneeId = await resolveCreateAssigneeId(user, branchId, parsed.data.assigneeId ?? null);

    const task = await prisma.dailyTask.create({
      data: {
        title: parsed.data.title,
        date: parsed.data.date,
        authorId: user.id,
        branchId,
        assigneeId,
      },
      include: taskInclude,
    });

    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      if (error.message === "FORBIDDEN_ASSIGNEE") {
        return NextResponse.json({ ok: false, error: he.dailyTasks.forbiddenAssignee }, { status: 403 });
      }
      if (error.message === "ASSIGNEE_NOT_IN_BRANCH") {
        return NextResponse.json({ ok: false, error: he.dailyTasks.assigneeNotFound }, { status: 400 });
      }
    }
    return NextResponse.json({ ok: false, error: he.dailyTasks.toastError }, { status: 500 });
  }
}
