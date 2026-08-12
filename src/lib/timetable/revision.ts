/**
 * Optimistic concurrency helpers for timetable confirm.
 *
 * Editable-grid saves wholesale-replace a class. Without a revision check,
 * a stale editor can erase a newer save from another tab/staff member.
 * Import confirms omit expected revisions and keep full-replace behavior.
 */

export type ClassRevision = {
  className: string;
  maxUpdatedAt: string;
};

/** Latest updatedAt among rows, as ISO string; null if none. */
export function maxUpdatedAtIso(
  values: Array<Date | string | null | undefined>
): string | null {
  let maxMs = -1;
  for (const value of values) {
    if (value == null) continue;
    const ms = value instanceof Date ? value.getTime() : Date.parse(value);
    if (Number.isFinite(ms) && ms > maxMs) maxMs = ms;
  }
  if (maxMs < 0) return null;
  return new Date(maxMs).toISOString();
}

/**
 * True when the DB has a newer revision than the editor loaded.
 * Missing/invalid expected → not stale (import path or first save).
 * Empty DB class → not stale.
 */
export function isStaleClassRevision(
  expectedMaxUpdatedAt: string | null | undefined,
  actualMaxUpdatedAt: string | null | undefined
): boolean {
  if (!expectedMaxUpdatedAt?.trim()) return false;
  if (!actualMaxUpdatedAt?.trim()) return false;
  const expectedMs = Date.parse(expectedMaxUpdatedAt);
  const actualMs = Date.parse(actualMaxUpdatedAt);
  if (!Number.isFinite(expectedMs) || !Number.isFinite(actualMs)) return false;
  return actualMs > expectedMs;
}

/** Find the first class whose DB revision is newer than the editor baseline. */
export function findStaleClassRevision(
  expected: ClassRevision[] | null | undefined,
  actualByClass: Map<string, string | null>
): string | null {
  if (!expected?.length) return null;
  for (const rev of expected) {
    const className = rev.className.trim();
    if (!className) continue;
    const actual = actualByClass.get(className) ?? null;
    if (isStaleClassRevision(rev.maxUpdatedAt, actual)) {
      return className;
    }
  }
  return null;
}
