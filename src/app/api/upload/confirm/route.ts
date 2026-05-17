import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReviewPayloadSchema } from "@/lib/validators";
import { he } from "@/lib/i18n/he";
import {
  filterRowsByTargetStudents,
  TARGET_SUBJECT_FILTER_EMPTY_ERROR,
} from "@/lib/upload/target-subjects";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Persist a reviewed batch.
 * We do the matching work here so the UI doesn't need to know about
 * Student/Subject entities — it just sends names + grades.
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
    if (!user.branchId) {
      return NextResponse.json(
        { ok: false, error: "אין סניף משויך לחשבון — פנו למנהל המערכת" },
        { status: 400 }
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

    const branchId = user.branchId;
    const cleanedExternalIds = filteredRows
      .map((r) => r.externalId?.toString().trim() ?? "")
      .filter((v) => v.length > 0);
    const uniqueExternalIds = new Set(cleanedExternalIds);
    const uniqueRatio =
      cleanedExternalIds.length > 0 ? uniqueExternalIds.size / cleanedExternalIds.length : 0;
    const useExternalId = cleanedExternalIds.length >= 3 && uniqueRatio >= 0.9;

    const results = await prisma.$transaction(async (tx) => {
      const upload = await tx.uploadSession.create({
        data: {
          branchId,
          fileName,
          imagePath,
          status: "SAVED",
          rowCount: filteredRows.length,
          avgConfidence,
          uploaderId: user.id,
        },
      });

      const out = { saved: 0, studentsCreated: 0, subjectsCreated: 0 };

      for (const row of filteredRows) {
        const [firstName, ...rest] = row.studentName.trim().split(/\s+/);
        const lastName = rest.join(" ") || "(unknown)";

        const rowExternalId = row.externalId?.toString().trim();
        const reliableExternalId = useExternalId && rowExternalId ? rowExternalId : null;

        const studentWhere: Prisma.StudentWhereInput = reliableExternalId
          ? { branchId, externalId: reliableExternalId }
          : row.className
            ? { branchId, firstName, lastName, className: row.className }
            : { branchId, firstName, lastName };

        let student = await tx.student.findFirst({ where: studentWhere });
        if (!student) {
          student = await tx.student.create({
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
          await tx.student.update({
            where: { id: student.id },
            data: { className: row.className },
          });
        }

        let subject = await tx.subject.findFirst({
          where: { branchId, name: row.subject },
        });
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
              branchId,
              name: row.subject,
              color: palette[Math.floor(Math.random() * palette.length)],
            },
          });
          out.subjectsCreated++;
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
        out.saved++;
      }

      return { uploadId: upload.id, ...out };
    });

    return NextResponse.json({ ok: true, ...results });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[upload/confirm]", error);
    return NextResponse.json(
      { ok: false, error: he.api.saveFailed },
      { status: 500 }
    );
  }
}
