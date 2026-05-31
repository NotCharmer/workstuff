import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import {
  assertCanDeleteTask,
  assertCanModifyTask,
  loadTaskForUser,
  taskInclude,
} from "@/lib/daily-task-access";
import { PatchDailyTaskSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const branchId = await getViewBranchId(user);
    const task = await loadTaskForUser(params.id, branchId);
    if (!task) {
      return NextResponse.json({ ok: false, error: he.dailyTasks.taskNotFound }, { status: 404 });
    }

    assertCanModifyTask(user, task);

    const body = await req.json().catch(() => null);
    const parsed = PatchDailyTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    const updated = await prisma.dailyTask.update({
      where: { id: params.id },
      data: parsed.data,
      include: taskInclude,
    });

    return NextResponse.json({ ok: true, task: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, error: he.dailyTasks.forbidden }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: he.dailyTasks.taskNotFound }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "Account not active" }, { status: 403 });
    }

    const branchId = await getViewBranchId(user);
    const task = await loadTaskForUser(params.id, branchId);
    if (!task) {
      return NextResponse.json({ ok: false, error: he.dailyTasks.taskNotFound }, { status: 404 });
    }

    assertCanDeleteTask(user, task);

    await prisma.dailyTask.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ ok: false, error: he.dailyTasks.forbidden }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: he.dailyTasks.taskNotFound }, { status: 404 });
  }
}
