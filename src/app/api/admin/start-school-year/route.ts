import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getOrCreateAppConfig,
  nextSchoolYear,
  planStudentPromotions,
} from "@/lib/school-year";
import { he } from "@/lib/i18n/he";

type AppConfigRow = { currentSchoolYear: string };

/**
 * ADMIN only — roll all branches to the next school year:
 * tag current grades, promote classes (יא→יב), graduate יב, bump currentSchoolYear.
 *
 * Requires body.fromYear to match the locked current year so concurrent or
 * double-submit requests cannot advance twice or double-promote students.
 * The whole mutation runs in one transaction after FOR UPDATE on AppConfig.
 */
export async function POST(req: Request) {
  try {
    await requireRole(["ADMIN"]);

    const body = (await req.json().catch(() => null)) as { fromYear?: unknown } | null;
    const expectedFromYear =
      typeof body?.fromYear === "string" && body.fromYear.trim() ? body.fromYear.trim() : null;
    if (!expectedFromYear) {
      return NextResponse.json(
        { ok: false, error: he.schoolYear.startFailed },
        { status: 400 }
      );
    }

    // Ensure singleton exists before locking (create is outside the lock race window;
    // the transaction re-checks currentSchoolYear against expectedFromYear).
    await getOrCreateAppConfig();

    const result = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<AppConfigRow[]>`
          SELECT "currentSchoolYear" FROM "AppConfig" WHERE id = 'default' FOR UPDATE
        `;
        const fromYear = locked[0]?.currentSchoolYear;
        if (!fromYear) {
          throw new Error("missing_app_config");
        }
        if (fromYear !== expectedFromYear) {
          const err = new Error("year_conflict");
          (err as Error & { status: number; currentSchoolYear: string }).status = 409;
          (err as Error & { currentSchoolYear: string }).currentSchoolYear = fromYear;
          throw err;
        }

        const toYear = nextSchoolYear(fromYear);

        const tagResult = await tx.grade.updateMany({
          where: {
            OR: [{ schoolYear: null }, { schoolYear: fromYear }],
          },
          data: { schoolYear: fromYear },
        });

        const students = await tx.student.findMany({
          where: { status: "ACTIVE" },
          select: { id: true, className: true },
        });

        const plan = planStudentPromotions(students);

        if (plan.graduateIds.length > 0) {
          await tx.student.updateMany({
            where: { id: { in: plan.graduateIds }, status: "ACTIVE" },
            data: { status: "GRADUATED" },
          });
        }

        for (const [nextClassName, ids] of plan.promoteTo) {
          await tx.student.updateMany({
            where: { id: { in: ids }, status: "ACTIVE" },
            data: { className: nextClassName },
          });
        }

        const bumped = await tx.appConfig.updateMany({
          where: { id: "default", currentSchoolYear: fromYear },
          data: { currentSchoolYear: toYear },
        });
        if (bumped.count !== 1) {
          const err = new Error("year_conflict");
          (err as Error & { status: number; currentSchoolYear: string }).status = 409;
          (err as Error & { currentSchoolYear: string }).currentSchoolYear = toYear;
          throw err;
        }

        return {
          fromYear,
          toYear,
          gradesTagged: tagResult.count,
          promoted: [...plan.promoteTo.values()].reduce((n, ids) => n + ids.length, 0),
          graduated: plan.graduateIds.length,
          unchanged: plan.unchangedIds.length,
        };
      },
      { maxWait: 10_000, timeout: 120_000 }
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Error && error.message === "year_conflict") {
      const current =
        (error as Error & { currentSchoolYear?: string }).currentSchoolYear ?? null;
      return NextResponse.json(
        {
          ok: false,
          error: he.schoolYear.startConflict,
          currentSchoolYear: current,
        },
        { status: 409 }
      );
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
