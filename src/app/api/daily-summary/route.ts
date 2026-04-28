import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  DEFAULT_SUMMARY_CONFIG,
  buildDailySummary,
  type DailySummaryEvent,
  type DailySummaryConfig,
} from "@/lib/daily-summary";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "תאריך לא תקין" }, { status: 400 });
  }

  const team = (searchParams.get("team") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const programTitle = searchParams.get("programTitle")?.trim() || undefined;
  const schoolLine = searchParams.get("schoolLine")?.trim() || undefined;
  const greetingLine = searchParams.get("greetingLine")?.trim() || undefined;

  const [privateLessons, classVisits] = await Promise.all([
    prisma.privateLesson.findMany({
      where: { date },
      include: {
        student: {
          select: { firstName: true, lastName: true, className: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.classVisit.findMany({
      where: { date },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const events: DailySummaryEvent[] = [
    ...privateLessons.map((l) => ({
      kind: "private" as const,
      className: l.student.className,
      studentName: `${l.student.firstName} ${l.student.lastName}`.trim(),
      subject: l.subject,
      durationMinutes: l.durationMinutes,
    })),
    ...classVisits.map((v) => ({
      kind: "visit" as const,
      className: v.className,
      subject: v.subject,
      durationMinutes: v.durationMinutes,
    })),
  ];

  const cfg: DailySummaryConfig = {
    programTitle: programTitle ?? DEFAULT_SUMMARY_CONFIG.programTitle,
    schoolLine: schoolLine ?? DEFAULT_SUMMARY_CONFIG.schoolLine,
    greetingLine: greetingLine ?? DEFAULT_SUMMARY_CONFIG.greetingLine,
    team: team.length ? team : DEFAULT_SUMMARY_CONFIG.team,
  };

  const text = buildDailySummary(date, events, cfg);
  return NextResponse.json({
    ok: true,
    date,
    text,
    counts: {
      privateLessons: privateLessons.length,
      classVisits: classVisits.length,
    },
  });
}
