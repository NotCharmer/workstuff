import { NextResponse } from "next/server";
import { AuthError, getCurrentUser } from "@/lib/auth";
import { requireViewBranchId } from "@/lib/branch-scope";
import { parseGradeCsv, isCsvUpload } from "@/lib/csv/parse-grade-csv";
import { parseGradeImage } from "@/lib/ocr";
import type { ParseResult } from "@/lib/ocr/types";
import { he } from "@/lib/i18n/he";
import {
  filterRowsByTargetStudents,
  TARGET_SUBJECT_FILTER_EMPTY_ERROR,
} from "@/lib/upload/target-subjects";

export const runtime = "nodejs";

function applyOptionalTargetFilter(result: ParseResult): ParseResult {
  const rows = filterRowsByTargetStudents(result.rows);
  return { ...result, rows };
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const branchId = await requireViewBranchId(user);
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
      const filtered = applyOptionalTargetFilter(out.result);
      if (filtered.rows.length === 0) {
        return NextResponse.json(
          { ok: false, error: TARGET_SUBJECT_FILTER_EMPTY_ERROR },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: true, fileName: file.name, branchId, ...filtered });
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
    const filtered = applyOptionalTargetFilter(result);
    if (filtered.rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: TARGET_SUBJECT_FILTER_EMPTY_ERROR },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true, fileName: file.name, branchId, ...filtered });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    console.error("[upload/parse]", error);
    return NextResponse.json({ ok: false, error: he.api.saveFailed }, { status: 500 });
  }
}
