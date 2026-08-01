import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { ManualGradeSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { getCurrentSchoolYear } from "@/lib/school-year";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const student = await prisma.student.findFirst({
    where: { id: params.id, branchId: branchId },
  });
  if (!student) {
    return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
  }
  if (student.status === "GRADUATED") {
    return NextResponse.json(
      { ok: false, error: he.schoolYear.graduatedReadOnly },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = ManualGradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  const subjectName = parsed.data.subject.trim();
  let subject = await prisma.subject.findFirst({
    where: { branchId: branchId, name: subjectName },
  });
  if (!subject) {
    const palette = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#f43f5e", "#8b5cf6", "#14b8a6"];
    subject = await prisma.subject.create({
      data: {
        branchId: branchId,
        name: subjectName,
        color: palette[Math.floor(Math.random() * palette.length)],
      },
    });
  }

  const schoolYear = await getCurrentSchoolYear();
  const grade = await prisma.grade.create({
    data: {
      studentId: student.id,
      subjectId: subject.id,
      value: parsed.data.value,
      gradedAt: parsed.data.gradedAt ? new Date(parsed.data.gradedAt) : new Date(),
      source: "MANUAL",
      schoolYear,
    },
    include: { subject: true },
  });

  return NextResponse.json({ ok: true, grade });
}
