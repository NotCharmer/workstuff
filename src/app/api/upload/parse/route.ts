import { NextResponse } from "next/server";
import { parseGradeCsv, isCsvUpload } from "@/lib/csv/parse-grade-csv";
import { parseGradeImage } from "@/lib/ocr";
import type { ParseResult } from "@/lib/ocr/types";
import { he } from "@/lib/i18n/he";
import { isTargetSubject } from "@/lib/upload/target-subjects";

export const runtime = "nodejs";

function keepOnlyTargetStudents(result: ParseResult): ParseResult {
  const allowedStudents = new Set(
    result.rows.filter((row) => isTargetSubject(row.subject)).map((row) => row.studentName.trim())
  );
  const rows = result.rows.filter((row) => allowedStudents.has(row.studentName.trim()));
  return { ...result, rows };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: he.api.noFile }, { status: 400 });
  }

  const maxBytes = 12 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ ok: false, error: he.api.fileTooBig }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isCsvUpload(file)) {
    const out = parseGradeCsv(buffer, file.name);
    if (!out.ok) {
      return NextResponse.json({ ok: false, error: out.error }, { status: 400 });
    }
    const filtered = keepOnlyTargetStudents(out.result);
    if (filtered.rows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "לא נמצאו תלמידים עם ציון בפייתון, במיתוג או בפרוייקט גמר במערכות אלקטרוניות בקובץ.",
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, fileName: file.name, ...filtered });
  }

  const allowed = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
    "application/pdf",
  ];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { ok: false, error: he.api.badFile(file.type || "unknown") },
      { status: 415 }
    );
  }

  const result = await parseGradeImage({ name: file.name, buffer, mime: file.type });
  const filtered = keepOnlyTargetStudents(result);
  if (filtered.rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "לא נמצאו תלמידים עם ציון בפייתון, במיתוג או בפרוייקט גמר במערכות אלקטרוניות בקובץ.",
      },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, fileName: file.name, ...filtered });
}
