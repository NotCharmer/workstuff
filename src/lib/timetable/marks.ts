import { canonicalDay, padTime } from "@/lib/timetable/days";

export type LessonMarkFlags = {
  important: boolean;
  tutoringPull: boolean;
};

export function lessonMarkKey(input: {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
}) {
  return [
    input.className.trim(),
    canonicalDay(input.dayOfWeek),
    padTime(input.startTime),
    padTime(input.endTime),
    input.subject.trim(),
  ].join("|");
}

export function normalizeMarkSlot(input: {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
}) {
  return {
    className: input.className.trim(),
    dayOfWeek: canonicalDay(input.dayOfWeek),
    startTime: padTime(input.startTime),
    endTime: padTime(input.endTime),
    subject: input.subject.trim(),
  };
}

export const SUBJECT_IMPORTANT_EVENT = "lebronator:subject-important";

export function sameSubject(a: string, b: string) {
  return a.trim() === b.trim();
}

export function personalSlotKey(input: {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}) {
  return `${canonicalDay(input.dayOfWeek)}__${padTime(input.startTime)}__${padTime(input.endTime)}`;
}
