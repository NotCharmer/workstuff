import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { getCurrentSchoolYear, isCurrentSchoolYearGrade } from "@/lib/school-year";
import { he } from "@/lib/i18n/he";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  try {
    const grade = await prisma.grade.findFirst({
      where: { id: params.id, student: { branchId: branchId } },
      select: { id: true, schoolYear: true },
    });
    if (!grade) {
      return NextResponse.json({ ok: false, error: he.api.gradeNotFound }, { status: 404 });
    }
    const currentSchoolYear = await getCurrentSchoolYear();
    if (!isCurrentSchoolYearGrade(grade.schoolYear, currentSchoolYear)) {
      return NextResponse.json(
        { ok: false, error: he.schoolYear.archiveReadOnly },
        { status: 403 }
      );
    }
    await prisma.grade.delete({ where: { id: grade.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.gradeNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
