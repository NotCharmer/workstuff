import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PatchPrivateLessonSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = PatchPrivateLessonSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  try {
    const lesson = await prisma.privateLesson.update({
      where: { id: params.id },
      data: {
        ...parsed.data,
        subject:
          parsed.data.subject === undefined
            ? undefined
            : parsed.data.subject?.trim() || null,
        notes:
          parsed.data.notes === undefined
            ? undefined
            : parsed.data.notes?.trim() || null,
      },
    });
    return NextResponse.json({ ok: true, lesson });
  } catch {
    return NextResponse.json(
      { ok: false, error: "השיעור לא נמצא" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.privateLesson.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "השיעור לא נמצא" },
      { status: 404 }
    );
  }
}
