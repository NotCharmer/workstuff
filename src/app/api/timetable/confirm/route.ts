import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { requireViewBranchId } from "@/lib/branch-scope";
import { TimetablePayloadSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json({ ok: false, error: "החשבון אינו פעיל" }, { status: 403 });
    }
    const branchId = await requireViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = TimetablePayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    if (parsed.data.branchId && parsed.data.branchId !== branchId) {
      return NextResponse.json(
        { ok: false, error: "בית הספר הפעיל השתנה מאז הפענוח — חזרו לבית הספר המקורי ונסו שוב" },
        { status: 409 }
      );
    }

    const rows = parsed.data.rows;
    const classes = Array.from(new Set(rows.map((r) => r.className.trim())));

    await prisma.$transaction(async (tx) => {
      for (const className of classes) {
        await tx.timetableEntry.deleteMany({ where: { branchId, className } });
      }
      await tx.timetableEntry.createMany({
        data: rows.map((r) => ({
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
    });

    return NextResponse.json({ ok: true, saved: rows.length, classes: classes.length });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[timetable/confirm]", error);
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
