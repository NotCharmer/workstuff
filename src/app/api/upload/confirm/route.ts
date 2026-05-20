import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { requireViewBranchId } from "@/lib/branch-scope";
import { prisma } from "@/lib/db";
import { ReviewPayloadSchema, type GradeRow } from "@/lib/validators";
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

type PreparedGrade = {
  id: string;
  studentId: string;
  subjectId: string;
  value: number;
};

function isPrismaError(error: unknown, code: string) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

function splitStudentName(studentName: string) {
  const [firstName, ...rest] = studentName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") || "(unknown)" };
}

async function findOrCreateStudent(
  branchId: string,
  row: GradeRow,
  useExternalId: boolean
) {
  const { firstName, lastName } = splitStudentName(row.studentName);
  const rowExternalId = row.externalId?.toString().trim();
  const reliableExternalId = useExternalId && rowExternalId ? rowExternalId : null;

  const studentWhere: Prisma.StudentWhereInput = reliableExternalId
    ? { branchId, externalId: reliableExternalId }
    : row.className
      ? { branchId, firstName, lastName, className: row.className }
      : { branchId, firstName, lastName };

  let student = await prisma.student.findFirst({
    where: studentWhere,
    select: { id: true, className: true },
  });
  if (!student) {
    try {
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
        select: { id: true, className: true },
      });
      return { student, created: true };
    } catch (error) {
      if (!isPrismaError(error, "P2002")) throw error;
      student = await prisma.student.findFirst({
        where: studentWhere,
        select: { id: true, className: true },
      });
      if (!student) throw error;
    }
  } else if (row.className && student.className !== row.className) {
    student = await prisma.student.update({
      where: { id: student.id },
      data: { className: row.className },
      select: { id: true, className: true },
    });
  }

  return { student, created: false };
}

async function findOrCreateSubject(branchId: string, name: string) {
  let subject = await prisma.subject.findFirst({
    where: { branchId, name },
    select: { id: true },
  });
  if (!subject) {
    try {
      subject = await prisma.subject.create({
        data: {
          branchId,
          name,
          color: SUBJECT_PALETTE[Math.floor(Math.random() * SUBJECT_PALETTE.length)],
        },
        select: { id: true },
      });
      return { subject, created: true };
    } catch (error) {
      if (!isPrismaError(error, "P2002")) throw error;
      subject = await prisma.subject.findFirst({
        where: { branchId, name },
        select: { id: true },
      });
      if (!subject) throw error;
    }
  }

  return { subject, created: false };
}

async function cleanupCreatedLookupRows(studentIds: string[], subjectIds: string[]) {
  await Promise.allSettled([
    subjectIds.length
      ? prisma.subject.deleteMany({
          where: { id: { in: subjectIds }, grades: { none: {} } },
        })
      : Promise.resolve(),
    studentIds.length
      ? prisma.student.deleteMany({
          where: {
            id: { in: studentIds },
            grades: { none: {} },
            notes: { none: {} },
            privateLessons: { none: {} },
          },
        })
      : Promise.resolve(),
  ]);
}

async function createSavedUploadWithGrades(args: {
  uploadId: string;
  branchId: string;
  uploaderId: string;
  fileName: string;
  imagePath?: string | null;
  rowCount: number;
  avgConfidence?: number | null;
  grades: PreparedGrade[];
}) {
  const gradeValues = Prisma.join(
    args.grades.map(
      (grade) => Prisma.sql`(${grade.id}, ${grade.studentId}, ${grade.subjectId}, ${grade.value})`
    )
  );

  await prisma.$executeRaw`
    WITH inserted_upload AS (
      INSERT INTO "UploadSession"
        ("id", "branchId", "uploaderId", "fileName", "imagePath", "status", "rowCount", "avgConfidence", "createdAt")
      VALUES
        (${args.uploadId}, ${args.branchId}, ${args.uploaderId}, ${args.fileName}, ${args.imagePath ?? null}, 'SAVED', ${args.rowCount}, ${args.avgConfidence ?? null}, now())
      RETURNING "id"
    )
    INSERT INTO "Grade"
      ("id", "studentId", "subjectId", "value", "source", "uploadId", "gradedAt")
    SELECT v."id", v."studentId", v."subjectId", v."value", 'OCR', inserted_upload."id", now()
    FROM (VALUES ${gradeValues}) AS v("id", "studentId", "subjectId", "value")
    CROSS JOIN inserted_upload
  `;
}

/**
 * Persist a reviewed batch.
 * Student/subject lookup rows are prepared first; then the UploadSession and all
 * Grade rows are inserted by one Postgres statement to avoid partial grade saves.
 */
export async function POST(req: Request) {
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
    const cleanedExternalIds = filteredRows
      .map((r) => r.externalId?.toString().trim() ?? "")
      .filter((v) => v.length > 0);
    const uniqueExternalIds = new Set(cleanedExternalIds);
    const uniqueRatio =
      cleanedExternalIds.length > 0 ? uniqueExternalIds.size / cleanedExternalIds.length : 0;
    const useExternalId = cleanedExternalIds.length >= 3 && uniqueRatio >= 0.9;

    const out = {
      saved: 0,
      studentsCreated: 0,
      subjectsCreated: 0,
      uploadId: randomUUID(),
    };
    const grades: PreparedGrade[] = [];
    const createdStudentIds: string[] = [];
    const createdSubjectIds: string[] = [];

    try {
      for (const row of filteredRows) {
        const { student, created: studentCreated } = await findOrCreateStudent(
          branchId,
          row,
          useExternalId
        );
        if (studentCreated) {
          out.studentsCreated++;
          createdStudentIds.push(student.id);
        }

        const { subject, created: subjectCreated } = await findOrCreateSubject(
          branchId,
          row.subject
        );
        if (subjectCreated) {
          out.subjectsCreated++;
          createdSubjectIds.push(subject.id);
        }

        grades.push({
          id: randomUUID(),
          studentId: student.id,
          subjectId: subject.id,
          value: row.grade,
        });
      }

      await createSavedUploadWithGrades({
        uploadId: out.uploadId,
        branchId,
        uploaderId: user.id,
        fileName,
        imagePath,
        rowCount: filteredRows.length,
        avgConfidence,
        grades,
      });
      out.saved = grades.length;
    } catch (error) {
      await cleanupCreatedLookupRows(createdStudentIds, createdSubjectIds);
      throw error;
    }

    return NextResponse.json({ ok: true, ...out });
  } catch (error) {
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
