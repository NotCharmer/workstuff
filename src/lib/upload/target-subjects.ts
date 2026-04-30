/**
 * Subjects whose presence in an upload causes a student to be imported.
 * A student is kept iff at least one of their grades is in a subject whose
 * name contains one of these tokens (case-insensitive substring match).
 */
export const TARGET_SUBJECT_TOKENS = [
  "פייתון",
  "מיתוג",
  "python",
  "פרוייקט גמר",
  "פרויקט גמר",
];

export function isTargetSubject(subject: string): boolean {
  const normalized = subject.toLowerCase();
  return TARGET_SUBJECT_TOKENS.some((token) =>
    normalized.includes(token.toLowerCase())
  );
}
