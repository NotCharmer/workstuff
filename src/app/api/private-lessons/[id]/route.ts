import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { PatchPrivateLessonSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = PatchPrivateLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    const existing = await prisma.privateLesson.findFirst({
      where: { id: params.id, student: { branchId: branchId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "השיעור לא נמצא" },
        { status: 404 }
      );
    }
    const lesson = await prisma.privateLesson.update({
      where: { id: existing.id },
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
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
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
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const existing = await prisma.privateLesson.findFirst({
      where: { id: params.id, student: { branchId: branchId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "השיעור לא נמצא" },
        { status: 404 }
      );
    }
    await prisma.privateLesson.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: "השיעור לא נמצא" },
      { status: 404 }
    );
  }
}
