import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PatchDailyTaskSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = PatchDailyTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }
  try {
    const task = await prisma.dailyTask.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, task });
  } catch {
    return NextResponse.json({ ok: false, error: "המשימה לא נמצאה" }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.dailyTask.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "המשימה לא נמצאה" }, { status: 404 });
  }
}
