import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrCreateAppConfig,
  nextSchoolYear,
  planTimetableClassAction,
  promoteClassName,
} from "@/lib/school-year";
import { he } from "@/lib/i18n/he";

/**
 * ADMIN only — roll all branches to the next school year:
 * tag current grades, promote classes (יא→יב), graduate יב,
 * advance live timetable class labels, bump currentSchoolYear.
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

    // Timetable entries are the live schedule (no schoolYear). Delete graduated
    // class grids first, then rename remaining labels so cohorts keep their slots.
    const timetableEntries = await prisma.timetableEntry.findMany({
      select: { id: true, className: true },
    });
    let timetablePromoted = 0;
    let timetableRemoved = 0;
    let timetableUnchanged = 0;

    const toPromote: { id: string; next: string }[] = [];
    for (const entry of timetableEntries) {
      const action = planTimetableClassAction(entry.className);
      if (action.kind === "delete") {
        await prisma.timetableEntry.delete({ where: { id: entry.id } });
        timetableRemoved++;
      } else if (action.kind === "promote") {
        toPromote.push({ id: entry.id, next: action.next });
      } else {
        timetableUnchanged++;
      }
    }
    for (const entry of toPromote) {
      await prisma.timetableEntry.update({
        where: { id: entry.id },
        data: { className: entry.next },
      });
      timetablePromoted++;
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
      timetablePromoted,
      timetableRemoved,
      timetableUnchanged,
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
