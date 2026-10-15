import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { PatchStudentSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import type { TutoringUrgency } from "@/lib/tutoring";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  const body = await req.json().catch(() => null);
  const parsed = PatchStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  try {
    const data: {
      gender?: "MALE" | "FEMALE" | null;
      firstName?: string;
      lastName?: string;
      needsTutoring?: boolean;
      tutoringUrgency?: TutoringUrgency | null;
      tutoringScheduledFor?: string | null;
    } = {};
    if (Object.prototype.hasOwnProperty.call(parsed.data, "gender")) {
      data.gender = parsed.data.gender;
    }
    if (parsed.data.firstName !== undefined) data.firstName = parsed.data.firstName;
    if (parsed.data.lastName !== undefined) data.lastName = parsed.data.lastName;
    if (parsed.data.needsTutoring === false) {
      data.needsTutoring = false;
      data.tutoringUrgency = null;
      data.tutoringScheduledFor = null;
    } else if (parsed.data.needsTutoring === true) {
      data.needsTutoring = true;
    }
    if (parsed.data.tutoringUrgency !== undefined) {
      data.tutoringUrgency = parsed.data.tutoringUrgency;
      data.needsTutoring = parsed.data.tutoringUrgency !== null;
      if (parsed.data.tutoringUrgency === null) data.tutoringScheduledFor = null;
    }
    if (
      parsed.data.tutoringScheduledFor !== undefined &&
      data.tutoringUrgency !== null &&
      data.needsTutoring !== false
    ) {
      if (parsed.data.tutoringScheduledFor && parsed.data.tutoringUrgency === undefined) {
        const existing = await prisma.student.findFirst({
          where: { id: params.id, branchId: branchId },
          select: { needsTutoring: true },
        });
        if (!existing) {
          return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
        }
        if (!existing.needsTutoring) {
          return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
        }
      }
      data.tutoringScheduledFor = parsed.data.tutoringScheduledFor;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
    }

    const updated = await prisma.student.updateMany({
      where: { id: params.id, branchId: branchId },
      data,
    });
    if (updated.count === 0) {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    const student = await prisma.student.findFirst({
      where: { id: params.id, branchId: branchId },
      select: {
        id: true,
        gender: true,
        firstName: true,
        lastName: true,
        needsTutoring: true,
        tutoringUrgency: true,
        tutoringScheduledFor: true,
      },
    });
    return NextResponse.json({ ok: true, student });
  } catch (error) {
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
  const user = await getCurrentUser();
    const branchId = await getViewBranchId(user);
  try {
    const deleted = await prisma.student.deleteMany({
      where: { id: params.id, branchId: branchId },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ ok: false, error: he.api.studentNotFound }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: he.students.deleteError }, { status: 500 });
  }
}
