/** Client-safe copy of target-subject rules (keep in sync with target-subjects.ts). */
export const TARGET_SUBJECT_TOKENS = [
  "פייתון",
  "python",
  "מיתוג",
  "תקשוב ומערכות",
  "תקשוב",
  "מערכות",
  "חשמל",
  "אלקטרונ",
  "מערכות אלקטרונ",
  "פרוייקט גמר",
  "פרויקט גמר",
] as const;

export const TARGET_SUBJECT_FILTER_EMPTY_ERROR =
  "לא נמצאו תלמידים עם ציון בפייתון, חשמל, מיתוג או פרויקט גמר — לא נשמר דבר. הוסיפו שורה במקצוע יעד או בקשו לכבות את הסינון.";

export function isTargetSubject(subject: string): boolean {
  const normalized = subject.toLowerCase();
  return TARGET_SUBJECT_TOKENS.some((token) =>
    normalized.includes(token.toLowerCase())
  );
}

/** True if at least one student has a target-subject row (all their rows may then be saved). */
export function hasStudentsEligibleForTargetFilter<
  T extends { studentName: string; subject: string },
>(rows: T[]): boolean {
  const allowed = new Set(
    rows
      .filter((row) => isTargetSubject(row.subject))
      .map((row) => row.studentName.trim())
  );
  return rows.some((row) => allowed.has(row.studentName.trim()));
}
