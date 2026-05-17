import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { NoteSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const body = await req.json().catch(() => null);
  const parsed = NoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }
  try {
    const existing = await prisma.note.findFirst({
      where: { id: params.id, student: { branchId: branchId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: he.api.noteNotFound }, { status: 404 });
    }
    const note = await prisma.note.update({
      where: { id: existing.id },
      data: { body: parsed.data.body, category: parsed.data.category },
      include: { author: { select: { name: true } } },
    });
    return NextResponse.json({ ok: true, note });
  } catch {
    return NextResponse.json({ ok: false, error: he.api.noteNotFound }, { status: 404 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  try {
    const existing = await prisma.note.findFirst({
      where: { id: params.id, student: { branchId: branchId } },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: he.api.noteNotFound }, { status: 404 });
    }
    await prisma.note.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: he.api.noteNotFound }, { status: 404 });
  }
}
