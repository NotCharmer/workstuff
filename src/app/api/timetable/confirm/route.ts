import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { TimetablePayloadSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { replaceTimetableEntries } from "@/lib/timetable/replace";

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

  await replaceTimetableEntries(prisma, {
    branchId,
    classes,
    rows: rows.map((r) => ({
      branchId,
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

  return NextResponse.json({ ok: true, saved: rows.length, classes: classes.length });
}
