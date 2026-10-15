import { TUTORING_URGENCIES, type TutoringUrgency } from "@/lib/enums";

export { TUTORING_URGENCIES, type TutoringUrgency };

export const TUTORING_URGENCY_RANK: Record<TutoringUrgency, number> = {
  URGENT: 0,
  MEDIUM: 1,
  LIGHT: 2,
  STANDARD: 3,
};

const URGENCY_SET = new Set<string>(TUTORING_URGENCIES);

export function isTutoringUrgency(value: string | null | undefined): value is TutoringUrgency {
  return Boolean(value && URGENCY_SET.has(value));
}

/** Cadets marked before urgency existed stay on the regular tutoring list. */
export function effectiveTutoringUrgency(
  needsTutoring: boolean,
  urgency: string | null | undefined
): TutoringUrgency | null {
  if (isTutoringUrgency(urgency)) return urgency;
  return needsTutoring ? "STANDARD" : null;
}

export function isValidTutoringWhen(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return false;
  const date = new Date(year, month - 1, day, hour, minute);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute
  );
}

/** "YYYY-MM-DDTHH:mm" → "DD/MM/YYYY HH:mm" */
export function formatTutoringWhen(value: string | null | undefined): string {
  if (!value || !isValidTutoringWhen(value)) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
}
