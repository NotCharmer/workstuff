import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { PatchPersonalSlotSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { canonicalDay, padTime } from "@/lib/timetable/days";

export const runtime = "nodejs";

function normalizeSlot(input: { dayOfWeek: string; startTime: string; endTime: string }) {
  return {
    dayOfWeek: canonicalDay(input.dayOfWeek),
    startTime: padTime(input.startTime),
    endTime: padTime(input.endTime),
  };
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  const branchId = await getViewBranchId(user);
  if (!branchId) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PatchPersonalSlotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  const slot = normalizeSlot(parsed.data);
  if (!slot.dayOfWeek || !slot.startTime || !slot.endTime) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  const title = parsed.data.title.trim();
  const existing = await prisma.personalSlot.findUnique({
    where: {
      personal_slot: {
        userId: user.id,
        branchId,
        ...slot,
      },
    },
  });

  if (!title) {
    if (existing) {
      await prisma.personalSlot.delete({ where: { id: existing.id } });
    }
    return NextResponse.json({ ok: true, title: null });
  }

  const saved = await prisma.personalSlot.upsert({
    where: {
      personal_slot: {
        userId: user.id,
        branchId,
        ...slot,
      },
    },
    create: {
      userId: user.id,
      branchId,
      ...slot,
      title,
    },
    update: { title },
  });

  return NextResponse.json({ ok: true, title: saved.title });
}
