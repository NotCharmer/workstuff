import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ToggleImportantSubjectSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json().catch(() => null);
  const parsed = ToggleImportantSubjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
      { status: 400 }
    );
  }

  try {
    const subject = await prisma.subject.update({
      where: { id: params.id },
      data: { isImportant: parsed.data.isImportant },
      select: { id: true, isImportant: true },
    });
    return NextResponse.json({ ok: true, subject });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.subjectNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
