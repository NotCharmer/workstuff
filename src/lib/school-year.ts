import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

const GRADE_LAYERS = ["י", "יא", "יב"] as const;
type GradeLayer = (typeof GRADE_LAYERS)[number];

const LAYER_NEXT: Record<GradeLayer, GradeLayer | null> = {
  י: "יא",
  יא: "יב",
  יב: null,
};

/** Infer Israeli school year string from a date (July–June). */
export function inferSchoolYear(d = new Date()): string {
  const y = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 7) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

/** Advance "2025-2026" → "2026-2027". */
export function nextSchoolYear(year: string): string {
  const match = year.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return inferSchoolYear(new Date(new Date().getFullYear() + 1, 7, 1));
  }
  const start = Number(match[1]);
  return `${start + 1}-${start + 2}`;
}

/** Previous year: "2026-2027" → "2025-2026". */
export function previousSchoolYear(year: string): string {
  const match = year.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return inferSchoolYear(new Date(new Date().getFullYear() - 1, 7, 1));
  }
  const start = Number(match[1]);
  return `${start - 1}-${start}`;
}

const INVISIBLE_CHARS = /[\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g;
const CLASS_PUNCT = /[׳'ʼ′`״"”"\-–—־./\\]/g;

/** Strip decorations so "י' 3", "י-3", "יי3" all parse as י + 3. */
export function normalizeClassName(className: string): string {
  let s = className.replace(INVISIBLE_CHARS, "").replace(/כיתה/g, "");
  s = s.replace(CLASS_PUNCT, "").replace(/\s+/g, "").trim();
  s = s.replace(/^(יב|יא|י)\1/, "$1");
  return s;
}

function formatLayerAndSuffix(layer: string, suffix: string): string {
  if (!suffix) return layer;
  return `${layer} ${suffix}`;
}

/**
 * Parse Hebrew high-school class: layer (י/יא/יב) + optional numeric suffix.
 * e.g. יא3, י 3, י'12, יב2
 */
export function parseHebrewClass(
  className: string | null | undefined
): { layer: GradeLayer; suffix: string } | null {
  if (!className?.trim()) return null;
  const normalized = normalizeClassName(className);
  const forward = normalized.match(/^(יב|יא|י)(\d*)$/);
  if (forward) {
    return { layer: forward[1] as GradeLayer, suffix: forward[2] ?? "" };
  }
  const reversed = normalized.match(/^(\d+)(יב|יא|י)$/);
  if (reversed) {
    return { layer: reversed[2] as GradeLayer, suffix: reversed[1] ?? "" };
  }
  return null;
}

export type PromoteResult =
  | { kind: "promoted"; next: string }
  | { kind: "graduated"; next: string | null }
  | { kind: "unchanged"; next: string | null };

/**
 * י3 → יא3 | י 3 → יא 3 | יא3 → יב3 | יב2 → graduate
 */
export function promoteClassName(className: string | null | undefined): PromoteResult {
  if (!className?.trim()) {
    return { kind: "unchanged", next: className ?? null };
  }
  const parsed = parseHebrewClass(className);
  if (!parsed) {
    return { kind: "unchanged", next: className };
  }
  const nextLayer = LAYER_NEXT[parsed.layer];
  if (!nextLayer) {
    return { kind: "graduated", next: className };
  }
  return {
    kind: "promoted",
    next: formatLayerAndSuffix(nextLayer, parsed.suffix),
  };
}

export async function getOrCreateAppConfig(): Promise<{ currentSchoolYear: string }> {
  const existing = await prisma.appConfig.findUnique({ where: { id: "default" } });
  if (existing) {
    return { currentSchoolYear: existing.currentSchoolYear };
  }
  const year = inferSchoolYear();
  const created = await prisma.appConfig.create({
    data: { id: "default", currentSchoolYear: year },
  });
  return { currentSchoolYear: created.currentSchoolYear };
}

let tenthGradeRepair: Promise<void> | null = null;

/**
 * Students still in 10th-grade classes (י) who have last-year grades were
 * missed when the year rolled — promote them to יא once.
 */
export async function repairMissedTenthGradePromotions(
  currentYear: string
): Promise<number> {
  const students = await prisma.student.findMany({
    where: {
      status: "ACTIVE",
      grades: {
        some: {
          NOT: { schoolYear: currentYear },
        },
      },
    },
    select: { id: true, className: true },
  });

  const classRename = new Map<string, string>();
  let count = 0;

  for (const student of students) {
    const parsed = parseHebrewClass(student.className);
    if (parsed?.layer !== "י") continue;
    const result = promoteClassName(student.className);
    if (result.kind !== "promoted" || !result.next || result.next === student.className) {
      continue;
    }
    await prisma.student.update({
      where: { id: student.id },
      data: { className: result.next },
    });
    if (student.className) classRename.set(student.className, result.next);
    count++;
  }

  for (const [from, to] of classRename) {
    await prisma.timetableEntry.updateMany({
      where: { className: from },
      data: { className: to },
    });
    await prisma.classVisit.updateMany({
      where: { className: from },
      data: { className: to },
    });
  }

  return count;
}

export async function getCurrentSchoolYear(): Promise<string> {
  const config = await getOrCreateAppConfig();
  if (!tenthGradeRepair) {
    tenthGradeRepair = repairMissedTenthGradePromotions(config.currentSchoolYear)
      .then(() => undefined)
      .catch((error) => {
        console.error("[school-year] repair missed 10th-grade promotions", error);
        tenthGradeRepair = null;
      });
  }
  await tenthGradeRepair;
  return config.currentSchoolYear;
}

/** Untagged grades belong to the current year; past years match the stored label only. */
export function gradeWhereForSchoolYear(
  selectedYear: string,
  currentYear: string
): Prisma.GradeWhereInput {
  if (selectedYear === currentYear) {
    return { OR: [{ schoolYear: selectedYear }, { schoolYear: null }] };
  }
  return { schoolYear: selectedYear };
}

export async function listSchoolYears(branchId: string | null): Promise<string[]> {
  const current = await getCurrentSchoolYear();
  const rows = await prisma.grade.findMany({
    where: {
      schoolYear: { not: null },
      student: { branchId: branchId ?? null },
    },
    distinct: ["schoolYear"],
    select: { schoolYear: true },
  });
  const fromGrades = rows
    .map((row) => row.schoolYear)
    .filter((year): year is string => Boolean(year));
  return Array.from(new Set([current, ...fromGrades])).sort((a, b) => b.localeCompare(a));
}

export function resolveSelectedSchoolYear(
  requested: string | undefined,
  years: string[],
  current: string
): string {
  if (requested && years.includes(requested)) return requested;
  return current;
}
