import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { TimetablePayloadSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import {
  findStaleClassRevision,
  maxUpdatedAtIso,
} from "@/lib/timetable/revision";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const branchId = await getViewBranchId(user);
  const body = await req.json().catch(() => null);
  const parsed = TimetablePayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  const rows = parsed.data.rows;
  const classes = Array.from(new Set(rows.map((r) => r.className.trim())));
  const expectedRevisions = parsed.data.expectedRevisions;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (expectedRevisions?.length) {
        const actualByClass = new Map<string, string | null>();
        for (const className of classes) {
          const existing = await tx.timetableEntry.findMany({
            where: { branchId: branchId, className },
            select: { updatedAt: true },
          });
          actualByClass.set(
            className,
            maxUpdatedAtIso(existing.map((e) => e.updatedAt))
          );
        }
        const staleClass = findStaleClassRevision(expectedRevisions, actualByClass);
        if (staleClass) {
          return { conflictClass: staleClass as string };
        }
      }

      for (const className of classes) {
        await tx.timetableEntry.deleteMany({ where: { branchId: branchId, className } });
      }
      await tx.timetableEntry.createMany({
        data: rows.map((r) => ({
          branchId: branchId,
          className: r.className.trim(),
          dayOfWeek: r.dayOfWeek.trim(),
          startTime: r.startTime.trim(),
          endTime: r.endTime.trim(),
          subject: r.subject.trim(),
          teacher: r.teacher?.trim() || null,
          room: r.room?.trim() || null,
          source: "IMPORT",
        })),
      });

      const classRevisions: { className: string; maxUpdatedAt: string }[] = [];
      for (const className of classes) {
        const created = await tx.timetableEntry.findMany({
          where: { branchId: branchId, className },
          select: { updatedAt: true },
        });
        const maxUpdatedAt = maxUpdatedAtIso(created.map((e) => e.updatedAt));
        if (maxUpdatedAt) {
          classRevisions.push({ className, maxUpdatedAt });
        }
      }

      return { conflictClass: null as string | null, classRevisions };
    });

    if (result.conflictClass) {
      return NextResponse.json(
        {
          ok: false,
          error: he.timetable.conflictStale(result.conflictClass),
          conflictClass: result.conflictClass,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      saved: rows.length,
      classes: classes.length,
      classRevisions: result.classRevisions ?? [],
    });
  } catch (error) {
    console.error("[timetable/confirm]", error);
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
