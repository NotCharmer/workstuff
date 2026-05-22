import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { PatchStudentSchema } from "@/lib/validators";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const body = await req.json().catch(() => null);
    const parsed = PatchStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
    }

    const updated = await prisma.student.updateMany({
      where: { id: params.id, branchId: branchId },
      data: {
        gender: Object.prototype.hasOwnProperty.call(parsed.data, "gender")
          ? parsed.data.gender
          : undefined,
      },
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    const student = await prisma.student.findFirst({
      where: { id: params.id, branchId: branchId },
      select: { id: true, gender: true },
    });
    return NextResponse.json({ ok: true, student });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.students.updateError }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
    const deleted = await prisma.student.deleteMany({
      where: { id: params.id, branchId: branchId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.students.deleteError }, { status: 500 });
  }
}
