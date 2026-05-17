import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { NoteSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function POST(
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

  const student = await prisma.student.findFirst({
    where: { id: params.id, branchId: branchId },
  });
  if (!student) {
    return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
  }

  const note = await prisma.note.create({
    data: {
      studentId: student.id,
      authorId: user.id,
      body: parsed.data.body,
      category: parsed.data.category,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ ok: true, note });
}
