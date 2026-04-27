import { randomUUID } from "node:crypto";
import Papa from "papaparse";
import { he } from "@/lib/i18n/he";
import type { TimetableParseResult, TimetableRow } from "./types";

const norm = (s: string) =>
  s
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const ALIASES = {
  className: ["class", "classname", "כיתה"],
  dayOfWeek: ["day", "dayofweek", "weekday", "יום", "יום בשבוע"],
  startTime: ["start", "starttime", "from", "התחלה", "שעת התחלה"],
  endTime: ["end", "endtime", "to", "סיום", "שעת סיום"],
  subject: ["subject", "course", "מקצוע"],
  teacher: ["teacher", "מורה"],
  room: ["room", "classroom", "חדר", "כיתה לימוד"],
} as const;

function pick(headers: string[], keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const nk = norm(key);
    for (const h of headers) {
      if (norm(h) === nk || norm(h) === nk.replace(/\s/g, "")) return h;
    }
  }
  return undefined;
}

export function parseTimetableCsv(
  buffer: Buffer,
  fileName?: string
): { ok: true; result: TimetableParseResult } | { ok: false; error: string } {
  const text = buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });

  if (!parsed.data.length) {
    return { ok: false, error: he.api.csvEmpty };
  }

  const fields = (parsed.meta.fields?.filter(Boolean) as string[]) ?? [];
  const classCol = pick(fields, ALIASES.className);
  const dayCol = pick(fields, ALIASES.dayOfWeek);
  const startCol = pick(fields, ALIASES.startTime);
  const endCol = pick(fields, ALIASES.endTime);
  const subjectCol = pick(fields, ALIASES.subject);
  const teacherCol = pick(fields, ALIASES.teacher);
  const roomCol = pick(fields, ALIASES.room);
  const timeRangeCol = fields.find((f) => norm(f) === norm("זמן") || norm(f) === "time");
  const dayColumns = fields.filter((f) =>
    [
      "ראשון",
      "שני",
      "שלישי",
      "רביעי",
      "חמישי",
      "שישי",
      "שבת",
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].includes(norm(f))
  );

  if ((!classCol || !dayCol || !startCol || !endCol || !subjectCol) && !(timeRangeCol && dayColumns.length)) {
    return { ok: false, error: he.timetable.csvHeaders };
  }

  const warnings: string[] = [];
  const rows: TimetableRow[] = [];

  const inferredClassName = inferClassName(fileName);
  if (timeRangeCol && dayColumns.length) {
    for (let i = 0; i < parsed.data.length; i++) {
      const r = parsed.data[i];
      const range = (r[timeRangeCol] ?? "").trim();
      if (!range) continue;
      const { startTime, endTime } = splitTimeRange(range);
      if (!startTime || !endTime) {
        warnings.push(`${he.common.row} ${i + 2}: ${he.timetable.rowInvalid}`);
        continue;
      }

      for (const dayColName of dayColumns) {
        const subject = (r[dayColName] ?? "").trim();
        if (!subject) continue;
        rows.push({
          id: randomUUID(),
          className: inferredClassName,
          dayOfWeek: dayColName.trim(),
          startTime,
          endTime,
          subject,
          teacher: null,
          room: null,
          confidence: 0.99,
        });
      }
    }

    if (!rows.length) {
      return { ok: false, error: he.timetable.noRows };
    }
    return {
      ok: true,
      result: { rows, avgConfidence: 0.99, warnings, rawText: text.slice(0, 8000) },
    };
  }

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const className = (r[classCol] ?? "").trim();
    const dayOfWeek = (r[dayCol] ?? "").trim();
    const startTime = (r[startCol] ?? "").trim();
    const endTime = (r[endCol] ?? "").trim();
    const subject = (r[subjectCol] ?? "").trim();
    const teacher = teacherCol ? (r[teacherCol] ?? "").trim() || null : null;
    const room = roomCol ? (r[roomCol] ?? "").trim() || null : null;

    if (!className && !subject && !dayOfWeek) continue;
    if (!className || !dayOfWeek || !startTime || !endTime || !subject) {
      warnings.push(`${he.common.row} ${i + 2}: ${he.timetable.rowInvalid}`);
      continue;
    }

    rows.push({
      id: randomUUID(),
      className,
      dayOfWeek,
      startTime,
      endTime,
      subject,
      teacher,
      room,
      confidence: 0.99,
    });
  }

  if (!rows.length) {
    return { ok: false, error: he.timetable.noRows };
  }

  return {
    ok: true,
    result: { rows, avgConfidence: 0.99, warnings, rawText: text.slice(0, 8000) },
  };
}

function splitTimeRange(range: string): { startTime: string; endTime: string } {
  const cleaned = range.replace(/\s/g, "");
  const parts = cleaned.split("-");
  if (parts.length !== 2) return { startTime: "", endTime: "" };
  return { startTime: parts[0] ?? "", endTime: parts[1] ?? "" };
}

function inferClassName(fileName?: string): string {
  if (!fileName) return "Class";
  const base = fileName.replace(/\.[^.]+$/, "");
  const fromClassToken = base.match(/class[_\-\s]*([A-Za-z0-9א-ת]+)/i)?.[1];
  if (fromClassToken) return fromClassToken.toUpperCase();
  const cleaned = base.replace(/[_\-]+/g, " ").trim();
  return cleaned || "Class";
}

export function isTimetableCsv(file: File): boolean {
  const n = file.name.toLowerCase();
  if (n.endsWith(".csv")) return true;
  return file.type === "text/csv" || file.type === "application/csv";
}
