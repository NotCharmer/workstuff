import { randomUUID } from "node:crypto";
import Papa from "papaparse";
import { he } from "@/lib/i18n/he";
import { canonicalDay, isCanonicalDayInput } from "./days";
import type { TimetableParseResult, TimetableRow } from "./types";

const norm = (s: string) =>
  s
    .replace(/^﻿/, "")
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
  // NOTE: כיתה is class name, not room. Use כיתת לימוד / חדר for room.
  room: ["room", "classroom", "חדר", "כיתת לימוד"],
} as const;

function isDayHeader(input: string): boolean {
  return isCanonicalDayInput(input);
}

// Normalize "8:5" / "8:05" / "08:5" → "08:05" so the UI's strict HH:MM
// validation and <input type="time"> render the value.
function normalizeTime(input: string): string {
  const m = input.trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return input.trim();
  const h = m[1].padStart(2, "0");
  const min = m[2].padStart(2, "0");
  return `${h}:${min}`;
}

function pick(headers: string[], keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const nk = norm(key);
    for (const h of headers) {
      if (norm(h) === nk || norm(h) === nk.replace(/\s/g, "")) return h;
    }
  }
  return undefined;
}

// Strip UTF-8 BOM, decode as UTF-8, and fall back to Windows-1255 if the bytes
// look like Hebrew CP1255 (common for Excel-on-Windows exports).
function decodeCsv(buffer: Buffer): string {
  let body: Buffer = buffer;
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    body = buffer.subarray(3);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    try {
      return new TextDecoder("windows-1255", { fatal: false }).decode(body);
    } catch {
      return body.toString("utf-8");
    }
  }
}

export function parseTimetableCsv(
  buffer: Buffer,
  fileName?: string
): { ok: true; result: TimetableParseResult } | { ok: false; error: string } {
  const text = decodeCsv(buffer);
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^﻿/, "").trim(),
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

  // Detect a time-range column. "זמן" / "time" are the preferred labels.
  // Some files use "שעה" / "שעות" for the time range; only treat them as a
  // range column if the cells actually look like HH:MM-HH:MM (not period
  // numbers like "1","2","3").
  const dayColumns = fields.filter((f) => isDayHeader(f));
  const explicitRangeCol = fields.find(
    (f) => norm(f) === norm("זמן") || norm(f) === "time"
  );
  let timeRangeCol: string | undefined = explicitRangeCol;
  if (!timeRangeCol) {
    const rangePattern = /\d{1,2}:\d{2}\s*[-‐-―−]\s*\d{1,2}:\d{2}/;
    const candidates = fields.filter(
      (f) =>
        !isDayHeader(f) &&
        (norm(f) === "שעה" || norm(f) === "שעות" || norm(f) === "hour" || norm(f) === "hours")
    );
    for (const c of candidates) {
      const sample = parsed.data
        .slice(0, 5)
        .map((row) => (row[c] ?? "").trim())
        .filter(Boolean);
      if (sample.some((v) => rangePattern.test(v))) {
        timeRangeCol = c;
        break;
      }
    }
  }

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
          dayOfWeek: canonicalDay(dayColName),
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
    const className = (r[classCol!] ?? "").trim();
    const dayRaw = (r[dayCol!] ?? "").trim();
    const dayOfWeek = canonicalDay(dayRaw);
    const startTime = normalizeTime((r[startCol!] ?? "").trim());
    const endTime = normalizeTime((r[endCol!] ?? "").trim());
    const subject = (r[subjectCol!] ?? "").trim();
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

// Split "08:15-09:00" / "08:15 – 09:00" / "8:15—9:00" into start/end. Handles
// ASCII hyphen plus Unicode dashes (en-dash U+2013, em-dash U+2014, hyphen
// U+2010, figure-dash U+2012, horizontal-bar U+2015, minus U+2212), Hebrew
// "עד" separator, and surrounding whitespace incl. NBSP.
function splitTimeRange(range: string): { startTime: string; endTime: string } {
  const cleaned = range
    .replace(/[\s ]+/g, "")
    .replace(/[‐-―−]/g, "-")
    .replace(/עד/, "-");
  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length !== 2) return { startTime: "", endTime: "" };
  return {
    startTime: normalizeTime(parts[0]),
    endTime: normalizeTime(parts[1]),
  };
}

function inferClassName(fileName?: string): string {
  if (!fileName) return "Class";
  const base = fileName.replace(/\.[^.]+$/, "");
  // Capture the class token plus an optional group suffix, e.g. "class_y3_1"
  // → "Y3-1", "class-10b" → "10B".
  const match = base.match(/class[_\-\s]*([A-Za-z0-9א-ת]+)(?:[_\-\s]+([A-Za-z0-9א-ת]+))?/i);
  if (match) {
    const main = match[1].toUpperCase();
    const suffix = match[2] ? match[2].toUpperCase() : "";
    return suffix ? `${main}-${suffix}` : main;
  }
  const cleaned = base.replace(/[_\-]+/g, " ").trim();
  return cleaned || "Class";
}

export function isTimetableCsv(file: File): boolean {
  const n = file.name.toLowerCase();
  if (n.endsWith(".csv")) return true;
  return file.type === "text/csv" || file.type === "application/csv";
}
