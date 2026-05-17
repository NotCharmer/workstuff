import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { PrivateLessonSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function GET(req: Request) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const where: {
    student?: { branchId: string | null };
    studentId?: string;
    date?: { gte?: string; lte?: string };
  } = { student: { branchId: branchId } };
  if (studentId) where.studentId = studentId;
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = from;
    if (to) where.date.lte = to;
  }

  const lessons = await prisma.privateLesson.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          className: true,
          avatarHue: true,
        },
      },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ ok: true, lessons });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const body = await req.json().catch(() => null);
  const parsed = PrivateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  const student = await prisma.student.findFirst({
    where: { id: parsed.data.studentId, branchId: branchId },
  });
  if (!student) {
    return NextResponse.json(
      { ok: false, error: he.api.studentNotFound },
      { status: 404 }
    );
  }

  const lesson = await prisma.privateLesson.create({
    data: {
      studentId: parsed.data.studentId,
      date: parsed.data.date,
      durationMinutes: parsed.data.durationMinutes ?? 60,
      subject: parsed.data.subject?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          className: true,
          avatarHue: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, lesson }, { status: 201 });
}
