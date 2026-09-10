import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { PatchLessonMarkSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { lessonMarkKey, normalizeMarkSlot, sameSubject } from "@/lib/timetable/marks";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const branchId = await getViewBranchId(user);
  if (!branchId) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchLessonMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  const slot = normalizeMarkSlot(parsed.data);
  if (!slot.dayOfWeek || !slot.startTime || !slot.endTime || !slot.subject) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  if (parsed.data.applyToAllOfSubject && parsed.data.important !== undefined) {
    const updated = await applyImportantToSubject({
      userId: user.id,
      branchId,
      subject: slot.subject,
      important: parsed.data.important,
    });
    const current = await prisma.lessonMark.findUnique({
      where: {
        lesson_mark_slot: {
          userId: user.id,
          branchId,
          ...slot,
        },
      },
    });
    return NextResponse.json({
      ok: true,
      important: current?.important ?? false,
      tutoringPull: current?.tutoringPull ?? false,
      updated,
    });
  }

  const existing = await prisma.lessonMark.findUnique({
    where: {
      lesson_mark_slot: {
        userId: user.id,
        branchId,
        ...slot,
      },
    },
  });

  const important = parsed.data.important ?? existing?.important ?? false;
  const tutoringPull = parsed.data.tutoringPull ?? existing?.tutoringPull ?? false;

  if (!important && !tutoringPull) {
    if (existing) {
      await prisma.lessonMark.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ ok: true, important: false, tutoringPull: false, updated: 1 });
  }

  const saved = await prisma.lessonMark.upsert({
    where: {
      lesson_mark_slot: {
        userId: user.id,
        branchId,
        ...slot,
      },
    },
    create: {
      userId: user.id,
      branchId,
      ...slot,
      important,
      tutoringPull,
    },
    update: { important, tutoringPull },
  });

  return NextResponse.json({
    ok: true,
    important: saved.important,
    tutoringPull: saved.tutoringPull,
    updated: 1,
  });
}

async function applyImportantToSubject({
  userId,
  branchId,
  subject,
  important,
}: {
  userId: string;
  branchId: string;
  subject: string;
  important: boolean;
}) {
  const entries = await prisma.timetableEntry.findMany({
    where: { branchId },
    select: {
      className: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      subject: true,
    },
  });
  const slots = new Map<string, ReturnType<typeof normalizeMarkSlot>>();
  for (const entry of entries) {
    if (!sameSubject(entry.subject, subject)) continue;
    const normalized = normalizeMarkSlot(entry);
    slots.set(lessonMarkKey(normalized), normalized);
  }

  if (important) {
    for (const next of slots.values()) {
      const existing = await prisma.lessonMark.findUnique({
        where: {
          lesson_mark_slot: {
            userId,
            branchId,
            ...next,
          },
        },
      });
      if (existing) {
        if (!existing.important) {
          await prisma.lessonMark.update({
            where: { id: existing.id },
            data: { important: true },
          });
        }
      } else {
        await prisma.lessonMark.create({
          data: {
            userId,
            branchId,
            ...next,
            important: true,
            tutoringPull: false,
          },
        });
      }
    }
    return slots.size;
  }

  const marks = await prisma.lessonMark.findMany({
    where: { userId, branchId },
  });
  let updated = 0;
  for (const mark of marks) {
    if (!sameSubject(mark.subject, subject) || !mark.important) continue;
    updated += 1;
    if (mark.tutoringPull) {
      await prisma.lessonMark.update({
        where: { id: mark.id },
        data: { important: false },
      });
    } else {
      await prisma.lessonMark.delete({ where: { id: mark.id } });
    }
  }
  return updated;
}
