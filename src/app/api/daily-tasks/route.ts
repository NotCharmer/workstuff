import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DailyTaskSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }
  const tasks = await prisma.dailyTask.findMany({
    where: { date },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ ok: true, tasks });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const parsed = DailyTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }
  const task = await prisma.dailyTask.create({
    data: { title: parsed.data.title, date: parsed.data.date, authorId: user.id },
  });
  return NextResponse.json({ ok: true, task }, { status: 201 });
}
