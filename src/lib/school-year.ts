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

/** Normalize class labels like "יא 3" → "יא3". */
export function normalizeClassName(className: string): string {
  return className.replace(/\s+/g, "").trim();
}

/**
 * Parse Hebrew high-school class: layer (י/יא/יב) + optional numeric suffix.
 * e.g. יא3, י12, יב2
 */
export function parseHebrewClass(
  className: string | null | undefined
): { layer: GradeLayer; suffix: string } | null {
  if (!className?.trim()) return null;
  const normalized = normalizeClassName(className);
  const match = normalized.match(/^(יב|יא|י)(\d*)$/);
  if (!match) return null;
  return { layer: match[1] as GradeLayer, suffix: match[2] ?? "" };
}

export type PromoteResult =
  | { kind: "promoted"; next: string }
  | { kind: "graduated"; next: string | null }
  | { kind: "unchanged"; next: string | null };

export type StudentPromotionPlan = {
  promoteTo: Map<string, string[]>; // nextClassName -> student ids
  graduateIds: string[];
  unchangedIds: string[];
};

/**
 * י12 → יא12 | יא3 → יב3 | יב2 → graduate
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
  return { kind: "promoted", next: `${nextLayer}${parsed.suffix}` };
}

/**
 * Snapshot-based promotion plan. Callers must apply this plan atomically against
 * the same student rows that were read — never re-derive from post-update classNames.
 */
export function planStudentPromotions(
  students: Array<{ id: string; className: string | null }>
): StudentPromotionPlan {
  const promoteTo = new Map<string, string[]>();
  const graduateIds: string[] = [];
  const unchangedIds: string[] = [];

  for (const student of students) {
    const result = promoteClassName(student.className);
    if (result.kind === "graduated") {
      graduateIds.push(student.id);
    } else if (result.kind === "promoted" && result.next) {
      const bucket = promoteTo.get(result.next) ?? [];
      bucket.push(student.id);
      promoteTo.set(result.next, bucket);
    } else {
      unchangedIds.push(student.id);
    }
  }

  return { promoteTo, graduateIds, unchangedIds };
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

export async function getCurrentSchoolYear(): Promise<string> {
  const config = await getOrCreateAppConfig();
  return config.currentSchoolYear;
}
