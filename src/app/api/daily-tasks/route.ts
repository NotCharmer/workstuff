import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { DailyTaskSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
    }
    const tasks = await prisma.dailyTask.findMany({
      where: { date, branchId: branchId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ ok: true, tasks });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to load tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = DailyTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }
    const task = await prisma.dailyTask.create({
      data: { title: parsed.data.title, date: parsed.data.date, authorId: user.id, branchId: branchId },
    });
    return NextResponse.json({ ok: true, task }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed to save task" }, { status: 500 });
  }
}
