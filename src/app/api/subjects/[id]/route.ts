import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { ToggleImportantSubjectSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = ToggleImportantSubjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.invalidInput },
        { status: 400 }
      );
    }

    const updated = await prisma.subject.updateMany({
      where: { id: params.id, branchId: branchId },
      data: { isImportant: parsed.data.isImportant },
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: he.api.subjectNotFound }, { status: 404 });
    }
    const subject = await prisma.subject.findFirst({
      where: { id: params.id, branchId: branchId },
      select: { id: true, isImportant: true },
    });
    return NextResponse.json({ ok: true, subject });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.subjectNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
