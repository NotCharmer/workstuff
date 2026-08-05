/**
 * After school-year rollover, GRADUATED יב students keep their class labels
 * (e.g. יב3) while newly promoted יא students occupy the same labels as ACTIVE.
 * Private-lesson assignment must target ACTIVE students only so new lessons
 * are not attached to invisible graduated records that share the class name.
 */
export function canCreatePrivateLessonForStudent(
  status: string | null | undefined
): boolean {
  return status === "ACTIVE";
}
