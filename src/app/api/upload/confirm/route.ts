import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { requireViewBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { ReviewPayloadSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import {
  filterRowsByTargetStudents,
  TARGET_SUBJECT_FILTER_EMPTY_ERROR,
} from "@/lib/upload/target-subjects";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUBJECT_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#0ea5e9",
  "#f43f5e",
  "#8b5cf6",
  "#14b8a6",
];

function studentKey(row: { studentName: string; className?: string | null }): string {
  return `${row.studentName.trim()}|${row.className?.trim() ?? ""}`;
}

function getConsistentExternalIds(
  rows: Array<{ studentName: string; externalId?: string | null; className?: string | null }>
): Set<string> {
  const studentsByExternalId = new Map<string, Set<string>>();
  for (const row of rows) {
    const externalId = row.externalId?.toString().trim();
    if (!externalId) continue;
    const students = studentsByExternalId.get(externalId) ?? new Set<string>();
    students.add(studentKey(row));
    studentsByExternalId.set(externalId, students);
  }

  const consistent = new Set<string>();
  for (const [externalId, students] of studentsByExternalId) {
    if (students.size === 1) consistent.add(externalId);
  }
  return consistent;
}

/**
 * Persist a reviewed batch (sequential writes — Neon pooler does not support long Prisma transactions).
 */
export async function POST(req: Request) {
  let uploadIdForCleanup: string | null = null;
  try {
    const user = await getCurrentUser();
    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { ok: false, error: "החשבון אינו פעיל" },
        { status: 403 }
      );
    }
    const body = await req.json().catch(() => null);
    const parsed = ReviewPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? he.api.saveFailed },
        { status: 400 }
      );
    }

    const { fileName, rows, avgConfidence, imagePath } = parsed.data;
    const filteredRows = filterRowsByTargetStudents(rows);
    if (filteredRows.length === 0) {
      return NextResponse.json(
        { ok: false, error: TARGET_SUBJECT_FILTER_EMPTY_ERROR },
        { status: 400 }
      );
    }

    const branchId = await requireViewBranchId(user);
    const consistentExternalIds = getConsistentExternalIds(filteredRows);

    const upload = await prisma.uploadSession.create({
      data: {
        branchId,
        fileName,
        imagePath,
        status: "REVIEWED",
        rowCount: filteredRows.length,
        avgConfidence,
        uploaderId: user.id,
      },
    });
    uploadIdForCleanup = upload.id;

    const out = { saved: 0, studentsCreated: 0, subjectsCreated: 0, uploadId: upload.id };

    for (const row of filteredRows) {
      const [firstName, ...rest] = row.studentName.trim().split(/\s+/);
      const lastName = rest.join(" ") || "(unknown)";

      const rowExternalId = row.externalId?.toString().trim();
      const reliableExternalId =
        rowExternalId && consistentExternalIds.has(rowExternalId) ? rowExternalId : null;

      const nameWhere: Prisma.StudentWhereInput = row.className
        ? { branchId, firstName, lastName, className: row.className }
        : { branchId, firstName, lastName };

      let student = reliableExternalId
        ? await prisma.student.findFirst({
            where: { branchId, externalId: reliableExternalId },
          })
        : null;

      if (!student) {
        const nameMatches = await prisma.student.findMany({
          where: nameWhere,
          orderBy: { createdAt: "asc" },
          take: 2,
        });
        if (nameMatches.length > 1) {
          throw new Error(`Ambiguous student match for ${row.studentName}`);
        }
        student = nameMatches[0] ?? null;
        if (student && reliableExternalId && !student.externalId) {
          student = await prisma.student.update({
            where: { id: student.id },
            data: { externalId: reliableExternalId },
          });
        }
      }

      if (!student) {
        student = await prisma.student.create({
          data: {
            firstName,
            lastName,
            branchId,
            externalId: reliableExternalId,
            className: row.className || null,
            gender: "MALE",
            avatarHue: Math.floor(Math.random() * 360),
          },
        });
        out.studentsCreated++;
      } else if (row.className && student.className !== row.className) {
        await prisma.student.update({
          where: { id: student.id },
          data: { className: row.className },
        });
      }

      let subject = await prisma.subject.findFirst({
        where: { branchId, name: row.subject },
      });
      if (!subject) {
        subject = await prisma.subject.create({
          data: {
            branchId,
            name: row.subject,
            color: SUBJECT_PALETTE[Math.floor(Math.random() * SUBJECT_PALETTE.length)],
          },
        });
        out.subjectsCreated++;
      }

      await prisma.grade.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          value: row.grade,
          source: "OCR",
          uploadId: upload.id,
        },
      });
      out.saved++;
    }

    await prisma.uploadSession.update({
      where: { id: upload.id },
      data: { status: "SAVED", rowCount: out.saved },
    });
    uploadIdForCleanup = null;

    return NextResponse.json({ ok: true, ...out });
  } catch (error) {
    if (uploadIdForCleanup) {
      try {
        await prisma.grade.deleteMany({ where: { uploadId: uploadIdForCleanup } });
        await prisma.uploadSession.delete({ where: { id: uploadIdForCleanup } });
      } catch (cleanupError) {
        console.error("[upload/confirm cleanup]", cleanupError);
      }
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[upload/confirm]", error);
    const detail = error instanceof Error ? error.message : "";
    const isTx =
      detail.includes("Transaction") ||
      detail.includes("P2028") ||
      detail.includes("interactive transactions");
    return NextResponse.json(
      {
        ok: false,
        error: isTx
          ? "שגיאת מסד נתונים בזמן שמירה — נסו שוב בעוד רגע"
          : he.api.saveFailed,
      },
      { status: 500 }
    );
  }
}
