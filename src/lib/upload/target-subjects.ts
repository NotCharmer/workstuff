/**
 * Students are imported only if they have at least one grade in a "target" subject.
 * All of that student's rows are kept (history, English, etc.) — not only target subjects.
 *
 * Set UPLOAD_TARGET_SUBJECTS_ONLY=false to import every student in the file.
 */
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
];

export const STUDENT_LIST_EXTRA_SUBJECT_TOKENS = [
  "מעבדה באלקטרוניקה",
  "אלקטרוניקה",
  "מעבדה",
  "Python",
  "electronics",
  "lab",
] as const;

export const STUDENT_LIST_SUBJECT_TOKENS = Array.from(
  new Set([...TARGET_SUBJECT_TOKENS, ...STUDENT_LIST_EXTRA_SUBJECT_TOKENS])
);

export function isTargetSubject(subject: string): boolean {
  const normalized = subject.toLowerCase();
  return TARGET_SUBJECT_TOKENS.some((token) =>
    normalized.includes(token.toLowerCase())
  );
}

export function isStudentListSubject(subject: string): boolean {
  const normalized = subject.toLowerCase();
  return STUDENT_LIST_SUBJECT_TOKENS.some((token) =>
    normalized.includes(token.toLowerCase())
  );
}

/** Default on — only students with a target-subject grade are imported. */
export function shouldFilterUploadByTargetStudents(): boolean {
  return process.env.UPLOAD_TARGET_SUBJECTS_ONLY !== "false";
}

export function filterRowsByTargetStudents<
  T extends { studentName: string; subject: string },
>(rows: T[]): T[] {
  if (!shouldFilterUploadByTargetStudents()) return rows;
  const allowedStudents = new Set(
    rows
      .filter((row) => isTargetSubject(row.subject))
      .map((row) => row.studentName.trim())
  );
  return rows.filter((row) => allowedStudents.has(row.studentName.trim()));
}

export const TARGET_SUBJECT_FILTER_EMPTY_ERROR =
  "לא נמצאו תלמידים עם ציון בפייתון, חשמל, מיתוג או פרויקט גמר — לא נשמר דבר. בדקו שמות המקצועות בטבלה.";
