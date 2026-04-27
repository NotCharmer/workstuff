import { NextResponse } from "next/server";
import { he } from "@/lib/i18n/he";
import { isTimetableCsv, parseTimetableCsv } from "@/lib/timetable/parse-csv";
import { parseTimetableImage } from "@/lib/timetable/parse-image";

export const runtime = "nodejs";

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
  if (isTimetableCsv(file)) {
    const out = parseTimetableCsv(buffer, file.name);
    if (!out.ok) {
      return NextResponse.json({ ok: false, error: out.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, fileName: file.name, ...out.result });
  }

  const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic", "image/heif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ ok: false, error: he.api.badFile(file.type || "unknown") }, { status: 415 });
  }

  const result = await parseTimetableImage({ name: file.name, buffer, mime: file.type });
  if (!result.rows.length) {
    return NextResponse.json(
      { ok: false, error: result.warnings[0] ?? he.timetable.noRows, warnings: result.warnings },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, fileName: file.name, ...result });
}
