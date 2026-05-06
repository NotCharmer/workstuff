import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReviewPayloadSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import { isTargetSubject } from "@/lib/upload/target-subjects";

export const runtime = "nodejs";

/**
 * Persist a reviewed batch.
 * We do the matching work here so the UI doesn't need to know about
 * Student/Subject entities — it just sends names + grades.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();

  const body = await req.json().catch(() => null);
  const parsed = ReviewPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? he.api.saveFailed },
      { status: 400 }
    );
  }
  const { fileName, rows, avgConfidence, imagePath } = parsed.data;
  const allowedStudents = new Set(
    rows.filter((row) => isTargetSubject(row.subject)).map((row) => row.studentName.trim())
  );
  const filteredRows = rows.filter((row) => allowedStudents.has(row.studentName.trim()));
  if (filteredRows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "לא נמצאו תלמידים עם ציון בפייתון, במיתוג או בפרוייקט גמר במערכות אלקטרוניות לשמירה.",
      },
      { status: 400 }
    );
  }

  const cleanedExternalIds = filteredRows
    .map((r) => r.externalId?.toString().trim() ?? "")
    .filter((v) => v.length > 0);
  const uniqueExternalIds = new Set(cleanedExternalIds);
  const uniqueRatio =
    cleanedExternalIds.length > 0 ? uniqueExternalIds.size / cleanedExternalIds.length : 0;

  // Some school exports place "negative grades count" in an adjacent numeric column.
  // If ids are low-entropy / repeated heavily, ignore externalId for this batch.
  const useExternalId = cleanedExternalIds.length >= 3 && uniqueRatio >= 0.9;

  const { uploadId, results } = await prisma.$transaction(async (tx) => {
    const upload = await tx.uploadSession.create({
      data: {
        fileName,
        imagePath,
        status: "SAVED",
        rowCount: filteredRows.length,
        avgConfidence,
        uploaderId: user.id,
      },
    });

    const results: {
      saved: number;
      studentsCreated: number;
      subjectsCreated: number;
    } = { saved: 0, studentsCreated: 0, subjectsCreated: 0 };

    // Small batch, sequential inserts are fine and keep the matching logic legible.
    for (const row of filteredRows) {
      const [firstName, ...rest] = row.studentName.trim().split(/\s+/);
      const lastName = rest.join(" ") || "(unknown)";

      const rowExternalId = row.externalId?.toString().trim();
      const reliableExternalId = useExternalId && rowExternalId ? rowExternalId : null;

      const studentWhere: Prisma.StudentWhereInput = reliableExternalId
        ? { externalId: reliableExternalId }
        : row.className
          ? { firstName, lastName, className: row.className }
          : { firstName, lastName };

      let student = await tx.student.findFirst({ where: studentWhere });
      if (!student) {
        student = await tx.student.create({
          data: {
            firstName,
            lastName,
            externalId: reliableExternalId,
            className: row.className || null,
            avatarHue: Math.floor(Math.random() * 360),
          },
        });
        results.studentsCreated++;
      } else if (row.className && student.className !== row.className) {
        await tx.student.update({
          where: { id: student.id },
          data: { className: row.className },
        });
      }

      let subject = await tx.subject.findUnique({ where: { name: row.subject } });
      if (!subject) {
        const palette = [
          "#6366f1",
          "#10b981",
          "#f59e0b",
          "#0ea5e9",
          "#f43f5e",
          "#8b5cf6",
          "#14b8a6",
        ];
        subject = await tx.subject.create({
          data: {
            name: row.subject,
            color: palette[Math.floor(Math.random() * palette.length)],
          },
        });
        results.subjectsCreated++;
      }

      await tx.grade.create({
        data: {
          studentId: student.id,
          subjectId: subject.id,
          value: row.grade,
          source: "OCR",
          uploadId: upload.id,
        },
      });
      results.saved++;
    }

    return { uploadId: upload.id, results };
  });

  return NextResponse.json({ ok: true, uploadId, ...results });
}
