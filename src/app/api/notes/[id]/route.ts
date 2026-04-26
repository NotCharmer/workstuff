import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NoteSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = NoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }
  try {
    const note = await prisma.note.update({
      where: { id: params.id },
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
  try {
    await prisma.note.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: he.api.noteNotFound }, { status: 404 });
  }
}
