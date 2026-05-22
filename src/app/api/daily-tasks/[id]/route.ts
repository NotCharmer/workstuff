import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { PatchDailyTaskSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = PatchDailyTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }
    const updated = await prisma.dailyTask.updateMany({
      where: { id: params.id, branchId: branchId },
      data: parsed.data,
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: "המשימה לא נמצאה" }, { status: 404 });
    }
    const task = await prisma.dailyTask.findFirst({
      where: { id: params.id, branchId: branchId },
    });
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "המשימה לא נמצאה" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const deleted = await prisma.dailyTask.deleteMany({
      where: { id: params.id, branchId: branchId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: "המשימה לא נמצאה" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "המשימה לא נמצאה" }, { status: 404 });
  }
}
