import {
  normalizeClassName,
  parseHebrewClass,
  promoteClassName,
} from "@/lib/school-year";

const LAYER_RANK: Record<string, number> = { י: 0, יא: 1, יב: 2 };

/**
 * Class labels to try when matching an upload row to an existing student.
 * After school-year rollover, CSVs often still carry last year's class (י3)
 * while the student row was promoted in place (יא3).
 */
export function classNamesForUploadLookup(
  csvClassName: string | null | undefined
): string[] {
  if (!csvClassName?.trim()) return [];
  const trimmed = csvClassName.trim();
  const names = [trimmed];
  const normalized = normalizeClassName(trimmed);
  if (normalized && normalized !== trimmed) {
    names.push(normalized);
  }
  const promoted = promoteClassName(trimmed);
  if (
    promoted.kind === "promoted" &&
    promoted.next &&
    !names.some((n) => normalizeClassName(n) === normalizeClassName(promoted.next!))
  ) {
    names.push(promoted.next);
  }
  return names;
}

/**
 * Whether upload confirm may overwrite an existing student's className.
 * Fills missing values and allows same-layer section moves / promotions,
 * but never demotes a Hebrew grade layer (e.g. יא3 ← י3 after rollover).
 */
export function shouldUpdateClassNameFromUpload(
  existingClassName: string | null | undefined,
  incomingClassName: string | null | undefined
): boolean {
  if (!incomingClassName?.trim()) return false;
  if (!existingClassName?.trim()) return true;

  const existingNorm = normalizeClassName(existingClassName);
  const incomingNorm = normalizeClassName(incomingClassName);
  if (existingNorm === incomingNorm) return false;

  const existing = parseHebrewClass(existingClassName);
  const incoming = parseHebrewClass(incomingClassName);
  if (!existing || !incoming) {
    // Unparseable labels: do not clobber a known placement from an import.
    return false;
  }

  const existingRank = LAYER_RANK[existing.layer];
  const incomingRank = LAYER_RANK[incoming.layer];
  if (incomingRank < existingRank) return false;

  return true;
}

/**
 * Pick a unique ACTIVE name match when class-based lookup missed.
 * Returns the sole candidate id, or null when zero/ambiguous.
 */
export function pickUniqueNameMatch<T extends { id: string }>(
  candidates: T[]
): T | null {
  if (candidates.length === 1) return candidates[0] ?? null;
  return null;
}
