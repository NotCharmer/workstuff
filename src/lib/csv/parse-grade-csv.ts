import { randomUUID } from "node:crypto";
import Papa from "papaparse";
import type { ParseResult, ExtractedRow } from "@/lib/ocr/types";
import { he } from "@/lib/i18n/he";

const norm = (s: string) =>
  s
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const GENERIC_HEADER_TOKENS = [
  "מחצית",
  "מטלה",
  "מבחן",
  "בוחן",
  "שליליים",
  "שם התלמיד",
  "ציונים שליליים",
];

const cleanSubjectName = (raw: string): string =>
  raw
    .replace(/\r?\n/g, " ")
    .replace(/\([^)]*\)/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();

const looksGenericHeader = (raw: string): boolean => {
  const n = norm(raw);
  if (!n) return true;
  return GENERIC_HEADER_TOKENS.some((t) => n.includes(norm(t)));
};

const ALIASES = {
  studentName: [
    "studentname",
    "student",
    "name",
    "full name",
    "שם התלמיד",
    "תלמיד",
    "שם",
    "שם מלא",
    "תלמידה",
  ],
  subject: ["subject", "course", "מקצוע"],
  grade: ["grade", "score", "mark", "ציון", "ציון מספרי סופי"],
  className: ["classname", "class", "כיתה"],
  layer: ["שכבה", "grade level"],
  externalId: [
    "externalid",
    "student id",
    "id",
    "מזהה",
    "מספר",
    "ת.ז",
    "ת.ז. התלמיד",
    "תעודה",
  ],
} as const;

function headerMatchesAlias(cell: string, aliases: readonly string[]): boolean {
  const n = norm(cell);
  if (!n) return false;
  if (aliases.some((a) => norm(a) === n)) return true;
  if (aliases.some((a) => norm(a) === n.replace(/\s/g, ""))) return true;
  return aliases.some((a) => {
    const na = norm(a);
    return na.length >= 2 && n.includes(na);
  });
}

function findColumn(headerRow: string[], aliases: readonly string[]): number {
  for (let c = 0; c < headerRow.length; c++) {
    const n = norm(headerRow[c] ?? "");
    if (aliases.some((a) => norm(a) === n || norm(a) === n.replace(/\s/g, ""))) {
      return c;
    }
  }
  const byLength = [...aliases].sort((a, b) => norm(b).length - norm(a).length);
  for (let c = 0; c < headerRow.length; c++) {
    const n = norm(headerRow[c] ?? "");
    if (
      byLength.some((a) => {
        const na = norm(a);
        return na.length >= 2 && n.includes(na);
      })
    ) {
      return c;
    }
  }
  return -1;
}

function isSerialColumn(header: string): boolean {
  const n = norm(header);
  return n === "מס'" || n.startsWith("מס") || n === "מספר";
}

function mapHeaders(headers: (string | undefined)[]):
  | {
      studentName: string;
      subject: string;
      grade: string;
      className?: string;
      externalId?: string;
    }
  | null {
  const clean = headers.filter((h): h is string => Boolean(h?.trim()));
  if (clean.length < 3) return null;

  const pick = (keys: readonly string[]): string | undefined => {
    for (const h of clean) {
      if (headerMatchesAlias(h, keys)) return h;
    }
    return undefined;
  };

  const studentName = pick(ALIASES.studentName);
  const subject = pick(ALIASES.subject);
  const grade = pick(ALIASES.grade);
  if (!studentName || !subject || !grade) return null;
  return {
    studentName,
    subject,
    grade,
    className: pick(ALIASES.className),
    externalId: pick(ALIASES.externalId),
  };
}

function parseComplexSadinCsv(
  text: string
): { ok: true; result: ParseResult } | { ok: false; error: string } {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
  });

  const rowsGrid = parsed.data;
  if (!rowsGrid.length) return { ok: false, error: he.api.csvEmpty };

  const nameMarkerRowIdx = rowsGrid.findIndex((row) =>
    row.some((c) => norm(c ?? "").includes("שם התלמיד"))
  );
  if (nameMarkerRowIdx < 0) {
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const markerRow = rowsGrid[nameMarkerRowIdx] ?? [];
  const nameCol = markerRow.findIndex((c) => norm(c ?? "").includes("שם התלמיד"));
  if (nameCol < 0) {
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const dataProbeRows = rowsGrid.slice(nameMarkerRowIdx + 1, nameMarkerRowIdx + 16);
  const nearbyCols = [nameCol - 1, nameCol, nameCol + 1, nameCol + 2].filter((c) => c >= 0);
  const isNameLike = (v: string) => /[A-Za-z\u0590-\u05FF]/.test(v) && !/^\d+$/.test(v);
  const isNumericLike = (v: string) => /^-?\d+(?:[.,]\d+)?$/.test(v);

  const resolvedNameCol =
    nearbyCols
      .map((col) => {
        const score = dataProbeRows.reduce((acc, row) => {
          const value = (row[col] ?? "").toString().trim();
          return acc + (isNameLike(value) ? 1 : 0);
        }, 0);
        return { col, score, distance: Math.abs(col - nameCol) };
      })
      .sort((a, b) => b.score - a.score || a.distance - b.distance)[0]?.col ?? nameCol;

  const resolvedExternalIdCol =
    nearbyCols
      .filter((col) => col !== resolvedNameCol)
      .map((col) => {
        const values = dataProbeRows
          .map((row) => (row[col] ?? "").toString().trim())
          .filter((v) => v.length > 0);
        const score = dataProbeRows.reduce((acc, row) => {
          const value = (row[col] ?? "").toString().trim();
          return acc + (isNumericLike(value) ? 1 : 0);
        }, 0);
        const unique = new Set(values).size;
        const uniqueness = values.length ? unique / values.length : 0;
        const sideBonus = col > resolvedNameCol ? 0.2 : 0;
        return {
          col,
          score,
          uniqueness,
          sideBonus,
          distance: Math.abs(col - resolvedNameCol),
        };
      })
      .sort(
        (a, b) =>
          b.uniqueness - a.uniqueness ||
          b.score + b.sideBonus - (a.score + a.sideBonus) ||
          a.distance - b.distance
      )[0]?.col ?? null;

  // In these exports, the subject labels are the nearest rich header row above
  // "שם התלמיד", while task/term rows below contain assignment names.
  let subjectRowIdx = -1;
  for (let i = nameMarkerRowIdx; i >= 0; i--) {
    const row = rowsGrid[i] ?? [];
    const meaningful = row
      .map((c) => cleanSubjectName(c ?? ""))
      .filter((c) => c.length > 0 && !looksGenericHeader(c));
    if (meaningful.length >= 2) {
      subjectRowIdx = i;
      break;
    }
  }
  if (subjectRowIdx < 0) {
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const titleRow = rowsGrid.find((row) => row.some((c) => norm(c ?? "").includes("לכיתה")));
  const titleCell = titleRow?.find((c) => norm(c ?? "").includes("לכיתה")) ?? "";
  const classMatch = titleCell.match(/לכיתה\s+(.+?)\s+מתאריך/) ?? titleCell.match(/לכיתה\s+([^,]+)/);
  const classNameFromTitle = classMatch?.[1]?.trim() || null;

  const subjectRow = rowsGrid[subjectRowIdx] ?? [];
  const subjectByCol: (string | null)[] = [];
  let currentSubject: string | null = null;
  for (let col = 0; col < resolvedNameCol; col++) {
    if (col === resolvedNameCol - 1) {
      // In Sadin exports this column is usually "negative grades count", not a subject grade.
      subjectByCol[col] = null;
      continue;
    }
    const cleaned = cleanSubjectName(subjectRow[col] ?? "");
    if (cleaned && !looksGenericHeader(cleaned)) {
      currentSubject = cleaned;
    }
    subjectByCol[col] = currentSubject;
  }

  const rows: ExtractedRow[] = [];
  const warnings: string[] = [];
  const dataStartRow = nameMarkerRowIdx + 1;

  for (let r = dataStartRow; r < rowsGrid.length; r++) {
    const row = rowsGrid[r] ?? [];
    const studentName = (row[resolvedNameCol] ?? "").toString().trim();
    if (!studentName) continue;

    const externalIdRaw =
      resolvedExternalIdCol != null ? (row[resolvedExternalIdCol] ?? "").toString().trim() : "";
    const externalId = externalIdRaw || null;

    for (let col = 0; col < resolvedNameCol; col++) {
      const subject = subjectByCol[col];
      if (!subject) continue;
      const raw = (row[col] ?? "").toString().trim().replace(",", ".");
      if (!raw) continue;
      const grade = Number.parseFloat(raw);
      if (Number.isNaN(grade)) continue;

      rows.push({
        id: randomUUID(),
        studentName,
        subject,
        grade: Math.min(100, Math.max(0, grade)),
        className: classNameFromTitle,
        externalId,
        confidence: 0.99,
      });
    }
  }

  if (!rows.length) {
    warnings.push("CSV זוהה כסדין מורחב, אך לא נמצאו ציונים מספריים לחילוץ.");
    return { ok: false, error: he.api.csvNoDataRows };
  }

  return {
    ok: true,
    result: {
      rows,
      avgConfidence: 0.99,
      rawText: text.slice(0, 8000),
      warnings,
    },
  };
}

function inferClassFromFilename(fileName: string): string | null {
  const stem = fileName.replace(/\.csv$/i, "");
  const hebrewY = /[_\-\s]?י(\d{1,2})(?:$|[_\-\s.])/u.exec(stem);
  if (hebrewY) return `י${hebrewY[1]}`;
  const m = /(?:^|[_\-\s])(y[a-z])(\d+)(?:$|[_\-\s])/i.exec(stem);
  if (!m) return null;
  const map: Record<string, string> = {
    ya: "יא",
    yb: "יב",
  };
  const prefix = map[m[1].toLowerCase()];
  if (!prefix) return null;
  return `${prefix}${m[2]}`;
}

function buildClassName(
  layer: string | null,
  classNum: string | null,
  fileName: string
): string | null {
  const layerTrim = layer?.trim() || null;
  const classTrim = classNum?.trim() || null;
  if (layerTrim && classTrim) return `${layerTrim}${classTrim}`;
  if (classTrim) return classTrim;
  if (layerTrim) return layerTrim;
  return inferClassFromFilename(fileName);
}

/** Wide school export: one row per student, מקצוע column + several assessment grade columns. */
function parseSchoolExportWideCsv(
  text: string,
  fileName: string
): { ok: true; result: ParseResult } | { ok: false; error: string } {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });

  const grid = (parsed.data as string[][]).filter(
    (row) => Array.isArray(row) && row.some((c) => (c ?? "").toString().trim().length > 0)
  );
  if (grid.length < 2) return { ok: false, error: he.api.csvEmpty };

  const headerRow = (grid[0] ?? []).map((c) => (c ?? "").toString().replace(/^\uFEFF/, "").trim());
  const nameCol = findColumn(headerRow, ALIASES.studentName);
  const subjectCol = findColumn(headerRow, ALIASES.subject);
  if (nameCol < 0 || subjectCol < 0) {
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const externalIdCol = findColumn(headerRow, ALIASES.externalId);
  const classCol = findColumn(headerRow, ALIASES.className);
  const layerCol = findColumn(headerRow, ALIASES.layer);
  const genderCol = headerRow.findIndex((h) => norm(h) === "מין");

  const reserved = new Set(
    [nameCol, subjectCol, externalIdCol, classCol, layerCol, genderCol].filter((c) => c >= 0)
  );
  for (let c = 0; c < headerRow.length; c++) {
    if (isSerialColumn(headerRow[c] ?? "")) reserved.add(c);
  }

  const gradeCols: { col: number; label: string }[] = [];
  for (let c = 0; c < headerRow.length; c++) {
    if (reserved.has(c)) continue;
    const label = cleanSubjectName(headerRow[c] ?? "");
    if (!label) continue;
    gradeCols.push({ col: c, label });
  }
  if (gradeCols.length === 0) {
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const rows: ExtractedRow[] = [];
  const warnings: string[] = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const studentName = (row[nameCol] ?? "").toString().trim();
    if (!studentName) continue;

    const subjectBase = (row[subjectCol] ?? "").toString().trim();
    if (!subjectBase) continue;

    const externalId =
      externalIdCol >= 0 ? (row[externalIdCol] ?? "").toString().trim() || null : null;
    const layer = layerCol >= 0 ? (row[layerCol] ?? "").toString().trim() || null : null;
    const classNum = classCol >= 0 ? (row[classCol] ?? "").toString().trim() || null : null;
    const className = buildClassName(layer, classNum, fileName);

    for (const { col, label } of gradeCols) {
      const raw = (row[col] ?? "").toString().trim().replace(",", ".");
      if (!raw) continue;
      const grade = Number.parseFloat(raw);
      if (Number.isNaN(grade)) continue;

      const subject =
        gradeCols.length === 1 && norm(label).includes("ציון")
          ? subjectBase
          : `${subjectBase} - ${label}`;

      rows.push({
        id: randomUUID(),
        studentName,
        subject,
        grade: Math.min(100, Math.max(0, grade)),
        className,
        externalId,
        confidence: 0.99,
      });
    }
  }

  if (rows.length === 0) {
    return { ok: false, error: he.api.csvNoDataRows };
  }

  return {
    ok: true,
    result: {
      rows,
      avgConfidence: 0.99,
      rawText: text.slice(0, 8000),
      warnings,
    },
  };
}

function parseWideGradeCsv(
  text: string,
  fileName: string
): { ok: true; result: ParseResult } | { ok: false; error: string } {
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: "greedy",
  });

  const grid = (parsed.data as string[][]).filter(
    (row) => Array.isArray(row) && row.some((c) => (c ?? "").toString().trim().length > 0)
  );
  if (grid.length < 2) return { ok: false, error: he.api.csvEmpty };

  const headerRow = (grid[0] ?? []).map((c) => (c ?? "").toString().replace(/^\uFEFF/, "").trim());

  const nameCol = findColumn(headerRow, ALIASES.studentName);
  if (nameCol < 0) return { ok: false, error: he.api.csvInvalidHeaders };

  const externalIdCol = findColumn(headerRow, ALIASES.externalId);
  const classCol = findColumn(headerRow, ALIASES.className);
  const subjectCol = findColumn(headerRow, ALIASES.subject);
  const reservedCols = new Set(
    [nameCol, externalIdCol, classCol, subjectCol].filter((c) => c >= 0)
  );
  for (let c = 0; c < headerRow.length; c++) {
    if (isSerialColumn(headerRow[c] ?? "")) reservedCols.add(c);
  }

  const subjectByCol = new Map<number, string>();
  for (let c = 0; c < headerRow.length; c++) {
    if (reservedCols.has(c)) continue;
    const cleaned = cleanSubjectName(headerRow[c] ?? "");
    if (!cleaned || looksGenericHeader(cleaned)) continue;
    subjectByCol.set(c, cleaned);
  }
  if (subjectByCol.size === 0) {
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const fileClass = inferClassFromFilename(fileName);
  const rows: ExtractedRow[] = [];
  const warnings: string[] = [];

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const studentName = (row[nameCol] ?? "").toString().trim();
    if (!studentName) continue;

    const externalId =
      externalIdCol >= 0 ? (row[externalIdCol] ?? "").toString().trim() || null : null;
    const rowClassName =
      classCol >= 0 ? (row[classCol] ?? "").toString().trim() || null : null;
    const className = rowClassName ?? fileClass;

    for (const [col, subject] of subjectByCol) {
      const raw = (row[col] ?? "").toString().trim().replace(",", ".");
      if (!raw) continue;
      const grade = Number.parseFloat(raw);
      if (Number.isNaN(grade)) continue;
      rows.push({
        id: randomUUID(),
        studentName,
        subject,
        grade: Math.min(100, Math.max(0, grade)),
        className,
        externalId,
        confidence: 0.99,
      });
    }
  }

  if (rows.length === 0) {
    return { ok: false, error: he.api.csvNoDataRows };
  }

  return {
    ok: true,
    result: {
      rows,
      avgConfidence: 0.99,
      rawText: text.slice(0, 8000),
      warnings,
    },
  };
}

export function parseGradeCsv(
  buffer: Buffer,
  fileName: string
):
  | { ok: true; result: ParseResult }
  | { ok: false; error: string } {
  const text = buffer.toString("utf-8");
  const ntext = norm(text);
  if (ntext.includes("שם התלמיד") && ntext.includes("ציונים שליליים")) {
    return parseComplexSadinCsv(text);
  }

  const schoolExport = parseSchoolExportWideCsv(text, fileName);
  if (schoolExport.ok) return schoolExport;

  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
  });

  for (const err of parsed.errors) {
    if (err.type === "Delimiter" && parsed.data.length) break;
  }

  if (!parsed.data.length) {
    return { ok: false, error: he.api.csvEmpty };
  }

  const fields = parsed.meta.fields?.filter(Boolean) as string[] | undefined;
  if (!fields?.length) {
    const wide = parseWideGradeCsv(text, fileName);
    if (wide.ok) return wide;
    if (ntext.includes("ציונים שליליים")) return parseComplexSadinCsv(text);
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const col = mapHeaders(fields);
  if (!col) {
    const wide = parseWideGradeCsv(text, fileName);
    if (wide.ok) return wide;
    if (ntext.includes("ציונים שליליים")) return parseComplexSadinCsv(text);
    return { ok: false, error: he.api.csvInvalidHeaders };
  }

  const rows: ExtractedRow[] = [];
  const warnings: string[] = [];
  for (const e of parsed.errors) {
    if (e.row != null) warnings.push(e.message);
  }

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const name = (r[col.studentName] ?? "").toString().trim();
    const subject = (r[col.subject] ?? "").toString().trim();
    const gRaw = (r[col.grade] ?? "")
      .toString()
      .trim()
      .replace(",", ".");
    if (!name && !subject) continue;
    if (!name) {
      warnings.push(`שורה ${i + 2}: ${he.api.csvRowMissingName}`);
      continue;
    }
    if (!subject) {
      warnings.push(`שורה ${i + 2}: ${he.api.csvRowMissingSubject}`);
      continue;
    }
    const g = Number.parseFloat(gRaw);
    if (Number.isNaN(g)) {
      warnings.push(`שורה ${i + 2}: ${he.api.csvRowBadGrade} (${gRaw})`);
      continue;
    }
    const gClamped = Math.min(100, Math.max(0, g));
    const className = col.className
      ? (r[col.className] ?? "").toString().trim() || null
      : null;
    const externalId = col.externalId
      ? (r[col.externalId] ?? "").toString().trim() || null
      : null;

    rows.push({
      id: randomUUID(),
      studentName: name,
      subject,
      grade: gClamped,
      className,
      externalId,
      confidence: 0.99,
    });
  }

  if (rows.length === 0) {
    return { ok: false, error: he.api.csvNoDataRows };
  }

  return {
    ok: true,
    result: {
      rows,
      avgConfidence: 0.99,
      rawText: text.slice(0, 8000),
      warnings,
    },
  };
}

export function isCsvUpload(file: File): boolean {
  const n = file.name.toLowerCase();
  if (n.endsWith(".csv")) return true;
  const t = file.type;
  return t === "text/csv" || t === "application/csv";
}
