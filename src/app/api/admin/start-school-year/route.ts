import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrCreateAppConfig,
  nextSchoolYear,
  promoteClassName,
} from "@/lib/school-year";
import { he } from "@/lib/i18n/he";

/**
 * ADMIN only — roll all branches to the next school year:
 * tag current grades, promote classes (יא→יב), graduate יב, bump currentSchoolYear.
 */
export async function POST() {
  try {
    await requireRole(["ADMIN"]);

    const config = await getOrCreateAppConfig();
    const fromYear = config.currentSchoolYear;
    const toYear = nextSchoolYear(fromYear);

    const tagResult = await prisma.grade.updateMany({
      where: {
        OR: [{ schoolYear: null }, { schoolYear: fromYear }],
      },
      data: { schoolYear: fromYear },
    });

    const students = await prisma.student.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, className: true },
    });

    let promoted = 0;
    let graduated = 0;
    let unchanged = 0;

    for (const student of students) {
      const result = promoteClassName(student.className);
      if (result.kind === "graduated") {
        await prisma.student.update({
          where: { id: student.id },
          data: { status: "GRADUATED" },
        });
        graduated++;
      } else if (result.kind === "promoted" && result.next) {
        await prisma.student.update({
          where: { id: student.id },
          data: { className: result.next },
        });
        promoted++;
      } else {
        unchanged++;
      }
    }

    await prisma.appConfig.update({
      where: { id: "default" },
      data: { currentSchoolYear: toYear },
    });

    return NextResponse.json({
      ok: true,
      fromYear,
      toYear,
      gradesTagged: tagResult.count,
      promoted,
      graduated,
      unchanged,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[admin/start-school-year]", error);
    return NextResponse.json(
      { ok: false, error: he.schoolYear.startFailed },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const config = await getOrCreateAppConfig();
    return NextResponse.json({
      ok: true,
      currentSchoolYear: config.currentSchoolYear,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: "Failed" }, { status: 500 });
  }
}
