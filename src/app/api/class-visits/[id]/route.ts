import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PatchClassVisitSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  const body = await req.json().catch(() => null);
  const parsed = PatchClassVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }
  try {
    const existing = await prisma.classVisit.findFirst({
      where: { id: params.id, branchId: user.branchId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "הביקור לא נמצא" }, { status: 404 });
    }
    const visit = await prisma.classVisit.update({
      where: { id: existing.id },
      data: {
        ...parsed.data,
        notes:
          parsed.data.notes === undefined
            ? undefined
            : parsed.data.notes?.trim() || null,
      },
    });
    return NextResponse.json({ ok: true, visit });
  } catch {
    return NextResponse.json({ ok: false, error: "הביקור לא נמצא" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  try {
    const existing = await prisma.classVisit.findFirst({
      where: { id: params.id, branchId: user.branchId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "הביקור לא נמצא" }, { status: 404 });
    }
    await prisma.classVisit.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "הביקור לא נמצא" }, { status: 404 });
  }
}
