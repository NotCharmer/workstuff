import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { CreateStudentSchema, CreateStudentsPayloadSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import type { CreateStudentInput } from "@/lib/validators";

export const runtime = "nodejs";

type CreatedStudent = {
  id: string;
  firstName: string;
  lastName: string;
  className: string | null;
};

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const branchId = await getViewBranchId(user);
  if (!branchId) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const students = parseStudents(body);
  if (!students) {
    return NextResponse.json({ ok: false, error: he.api.invalidInput }, { status: 400 });
  }

  const created: CreatedStudent[] = [];
  let skipped = 0;

  try {
    for (const input of students) {
      const result = await createOneStudent(branchId, input);
      if (result === "skipped") skipped += 1;
      else created.push(result);
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: he.students.alreadyExistsId }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: he.students.createError }, { status: 500 });
  }

  if (created.length === 0) {
    return NextResponse.json(
      { ok: false, error: he.students.alreadyExists, created: 0, skipped },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    created: created.length,
    skipped,
    students: created,
  });
}

function parseStudents(body: unknown): CreateStudentInput[] | null {
  if (!body || typeof body !== "object") return null;
  if ("students" in body) {
    const parsed = CreateStudentsPayloadSchema.safeParse(body);
    return parsed.success ? parsed.data.students : null;
  }
  const parsed = CreateStudentSchema.safeParse(body);
  return parsed.success ? [parsed.data] : null;
}

async function createOneStudent(
  branchId: string,
  input: CreateStudentInput
): Promise<CreatedStudent | "skipped"> {
  const firstName = input.firstName;
  const lastName = input.lastName;
  const className = input.className?.trim() || null;
  const externalId = input.externalId?.trim() || null;
  const gender = input.gender ?? null;

  if (externalId) {
    const byId = await prisma.student.findFirst({
      where: { branchId, externalId },
      select: { id: true },
    });
    if (byId) return "skipped";
  }

  const existing = await prisma.student.findFirst({
    where: {
      branchId,
      firstName,
      lastName,
      className,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (existing) return "skipped";

  try {
    return await prisma.student.create({
      data: {
        branchId,
        firstName,
        lastName,
        className,
        externalId,
        gender,
        avatarHue: Math.floor(Math.random() * 360),
        status: "ACTIVE",
      },
      select: { id: true, firstName: true, lastName: true, className: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "skipped";
    }
    throw error;
  }
}
