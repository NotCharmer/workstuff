import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { he } from "@/lib/i18n/he";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const grade = await prisma.grade.findFirst({
      where: { id: params.id, student: { branchId: branchId } },
      select: { id: true },
    });
    if (!grade) {
      return NextResponse.json({ ok: false, error: he.api.gradeNotFound }, { status: 404 });
    }
    await prisma.grade.delete({ where: { id: grade.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.gradeNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
