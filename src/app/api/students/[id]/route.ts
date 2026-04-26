import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.student.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.students.deleteError }, { status: 500 });
  }
}
