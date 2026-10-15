import { canonicalDay, dayOrderOf, padTime } from "@/lib/timetable/days";
import { sameClassName } from "@/lib/timetable/marks";

export type PlanSlot = {
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  important?: boolean;
  tutoringPull?: boolean;
};

export type BusyEntry = {
  className: string;
  subject: string;
  grade: string;
  canEnter: boolean;
  canTutor: boolean;
};

export type TutoringPlanRequest = {
  id: string;
  studentId: string | null;
  studentName: string | null;
  className: string | null;
  subject: string;
  tutoringDoneCount: number;
  status: "OPEN" | "DONE";
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function subjectMatches(requestSubject: string, lessonSubject: string) {
  const requested = normalizeText(requestSubject);
  const lesson = normalizeText(lessonSubject);
  if (!requested || !lesson) return false;
  if (requested === lesson) return true;
  const shorter = requested.length <= lesson.length ? requested : lesson;
  const longer = requested.length <= lesson.length ? lesson : requested;
  return shorter.length >= 2 && longer.includes(shorter);
}

function slotKey(slot: PlanSlot) {
  return [
    canonicalDay(slot.dayOfWeek),
    padTime(slot.startTime),
    padTime(slot.endTime),
    slot.subject.trim(),
  ].join("|");
}

function sortSlots(slots: PlanSlot[]) {
  return [...slots].sort((a, b) => {
    const day = dayOrderOf(a.dayOfWeek) - dayOrderOf(b.dayOfWeek);
    if (day) return day;
    const start = padTime(a.startTime).localeCompare(padTime(b.startTime));
    if (start) return start;
    return a.subject.localeCompare(b.subject, "he");
  });
}

function uniqueSlots(slots: PlanSlot[]) {
  const seen = new Set<string>();
  const unique: PlanSlot[] = [];
  for (const slot of sortSlots(slots)) {
    const key = slotKey(slot);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(slot);
  }
  return unique;
}

export function slotsForClass(className: string | null, slots: PlanSlot[]) {
  if (!className?.trim()) return [];
  return uniqueSlots(slots.filter((slot) => sameClassName(slot.className, className)));
}

export function subjectSlotsForClass(className: string | null, subject: string, lessons: PlanSlot[]) {
  return slotsForClass(className, lessons).filter((slot) => subjectMatches(subject, slot.subject));
}

export function subjectDoneTotal(request: TutoringPlanRequest, requests: TutoringPlanRequest[]) {
  const subject = normalizeText(request.subject);
  const studentKey = request.studentId ?? request.studentName?.trim() ?? request.id;
  return requests
    .filter((row) => {
      const rowKey = row.studentId ?? row.studentName?.trim() ?? row.id;
      return rowKey === studentKey && normalizeText(row.subject) === subject;
    })
    .reduce((sum, row) => sum + row.tutoringDoneCount, 0);
}

export function formatPlanDay(dayOfWeek: string) {
  const day = canonicalDay(dayOfWeek);
  if (!day) return "";
  return day.startsWith("יום") ? day : `יום ${day}`;
}

export function formatPlanTime(slot: Pick<PlanSlot, "dayOfWeek" | "startTime" | "endTime" | "subject">, includeSubject: boolean) {
  const when = `${formatPlanDay(slot.dayOfWeek)} · ${padTime(slot.startTime)}–${padTime(slot.endTime)}`;
  return includeSubject && slot.subject.trim() ? `${when} · ${slot.subject.trim()}` : when;
}

export function formatSubjectLessonTime(slot: PlanSlot, requestSubject: string) {
  return formatPlanTime(slot, normalizeText(slot.subject) !== normalizeText(requestSubject));
}

const GRADE_ORDER = ["י", "יא", "יב"] as const;

/** Grade cohort from a class name such as י'3, יא 3, or יב3. */
export function gradeLevelOf(className: string | null | undefined): (typeof GRADE_ORDER)[number] | null {
  const compact = (className ?? "").trim().replace(/\s+/g, "").replace(/["'׳״`]/g, "");
  if (!compact) return null;
  if (/^יב/.test(compact) || /^12/.test(compact)) return "יב";
  if (/^יא/.test(compact) || /^11/.test(compact)) return "יא";
  if (/^י/.test(compact) || /^10/.test(compact)) return "י";
  return null;
}

export type BusyHour = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  grades: string[];
  entries: BusyEntry[];
};

function entryKey(entry: BusyEntry) {
  return `${entry.grade}|${entry.className}|${entry.subject}`;
}

function sortEntries(entries: BusyEntry[]) {
  return [...entries].sort(
    (a, b) =>
      GRADE_ORDER.indexOf(a.grade as (typeof GRADE_ORDER)[number]) -
        GRADE_ORDER.indexOf(b.grade as (typeof GRADE_ORDER)[number]) ||
      a.className.localeCompare(b.className, "he") ||
      a.subject.localeCompare(b.subject, "he")
  );
}

function combineEntries(current: BusyEntry[], extra: BusyEntry[]) {
  const byKey = new Map(current.map((entry) => [entryKey(entry), { ...entry }]));
  for (const entry of extra) {
    const key = entryKey(entry);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...entry });
      continue;
    }
    existing.canEnter = existing.canEnter || entry.canEnter;
    existing.canTutor = existing.canTutor || entry.canTutor;
  }
  return sortEntries([...byKey.values()]);
}

function toMinutes(time: string) {
  const [hours, minutes] = padTime(time).split(":").map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.MAX_SAFE_INTEGER;
  return hours * 60 + minutes;
}

/** Short breaks still count as one stretch. A 15-minute recess starts a new block. */
const CONNECTED_GAP_MINUTES = 10;

function mergeConnectedBusyHours(hours: BusyHour[]): BusyHour[] {
  const byDay = new Map<string, BusyHour[]>();
  for (const hour of hours) {
    const day = canonicalDay(hour.dayOfWeek);
    const list = byDay.get(day) ?? [];
    list.push({ ...hour, dayOfWeek: day });
    byDay.set(day, list);
  }

  const merged: BusyHour[] = [];
  for (const list of byDay.values()) {
    const sorted = [...list].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
    let current: BusyHour | null = null;
    for (const hour of sorted) {
      if (!current) {
        current = {
          ...hour,
          entries: [...hour.entries],
          grades: [...hour.grades],
        };
        continue;
      }
      const gap = toMinutes(hour.startTime) - toMinutes(current.endTime);
      if (gap <= CONNECTED_GAP_MINUTES) {
        const endTime = toMinutes(hour.endTime) > toMinutes(current.endTime) ? hour.endTime : current.endTime;
        const entries = combineEntries(current.entries, hour.entries);
        current = {
          ...current,
          endTime,
          entries,
          grades: GRADE_ORDER.filter((grade) => entries.some((entry) => entry.grade === grade)),
        };
        continue;
      }
      merged.push(current);
      current = {
        ...hour,
        entries: [...hour.entries],
        grades: [...hour.grades],
      };
    }
    if (current) merged.push(current);
  }

  return merged.sort((a, b) => {
    const day = dayOrderOf(a.dayOfWeek) - dayOrderOf(b.dayOfWeek);
    if (day) return day;
    return toMinutes(a.startTime) - toMinutes(b.startTime) || toMinutes(a.endTime) - toMinutes(b.endTime);
  });
}

function timeKey(slot: Pick<PlanSlot, "dayOfWeek" | "startTime" | "endTime">) {
  return `${canonicalDay(slot.dayOfWeek)}|${padTime(slot.startTime)}|${padTime(slot.endTime)}`;
}

/** Every hour marked for entering a lesson or pulling a student out, including a single class. */
export function busyGradeHours(slots: PlanSlot[]): BusyHour[] {
  const groups = new Map<string, PlanSlot[]>();
  for (const slot of slots) {
    const key = timeKey(slot);
    const group = groups.get(key) ?? [];
    group.push(slot);
    groups.set(key, group);
  }

  const busy: BusyHour[] = [];
  for (const group of groups.values()) {
    const entries: BusyHour["entries"] = [];
    for (const slot of sortSlots(group)) {
      const className = slot.className.trim();
      const subject = slot.subject.trim();
      if (!className && !subject) continue;
      const grade = gradeLevelOf(className) ?? "";
      const key = `${className}|${subject}`;
      const existing = entries.find((entry) => `${entry.className}|${entry.subject}` === key);
      if (existing) {
        existing.canEnter = existing.canEnter || Boolean(slot.important);
        existing.canTutor = existing.canTutor || Boolean(slot.tutoringPull);
        continue;
      }
      entries.push({
        className,
        subject,
        grade,
        canEnter: Boolean(slot.important),
        canTutor: Boolean(slot.tutoringPull),
      });
    }
    if (entries.length === 0) continue;
    const sortedEntries = sortEntries(entries);
    const grades = GRADE_ORDER.filter((grade) => entries.some((entry) => entry.grade === grade));
    const sample = group[0];
    busy.push({
      dayOfWeek: canonicalDay(sample.dayOfWeek),
      startTime: padTime(sample.startTime),
      endTime: padTime(sample.endTime),
      grades: [...grades],
      entries: sortedEntries,
    });
  }

  return mergeConnectedBusyHours(
    busy.sort((a, b) => {
      const day = dayOrderOf(a.dayOfWeek) - dayOrderOf(b.dayOfWeek);
      if (day) return day;
      return a.startTime.localeCompare(b.startTime);
    })
  );
}

export function formatBusyEntry(
  entry: BusyEntry,
  labels: { tutor: string; enter: string }
) {
  const tags = [entry.canTutor ? labels.tutor : "", entry.canEnter ? labels.enter : ""].filter(Boolean);
  const action = tags.length > 0 ? ` (${tags.join(", ")})` : "";
  return `${entry.subject} · ${entry.className}${action}`;
}

export function formatBusyHours(
  hours: BusyHour[],
  labels: {
    title: string;
    empty: string;
    grades: (list: string) => string;
    tutor: string;
    enter: string;
  }
) {
  if (hours.length === 0) return `${labels.title}\n${labels.empty}`;
  const blocks = hours.map((hour) => {
    const gradeLabel = hour.grades.length >= 2 ? ` — ${labels.grades(hour.grades.join(", "))}` : "";
    const head = `${formatPlanDay(hour.dayOfWeek)} · ${hour.startTime}–${hour.endTime}${gradeLabel}`;
    const lines = hour.entries.map((entry) => formatBusyEntry(entry, labels));
    return [head, ...lines].join("\n");
  });
  return `${labels.title}\n\n${blocks.join("\n\n")}`;
}

export function formatTutoringPlans(
  requests: TutoringPlanRequest[],
  pulls: PlanSlot[],
  lessons: PlanSlot[],
  labels: {
    noStudent: string;
    noClass: string;
    pullTitle: string;
    pullEmpty: string;
    subjectTitle: string;
    subjectEmpty: string;
    doneCount: (count: number, subject: string) => string;
  }
) {
  const blocks = requests.map((request) => {
    const classPulls = slotsForClass(request.className, pulls);
    const classLessons = subjectSlotsForClass(request.className, request.subject, lessons);
    const who = request.studentName?.trim() || labels.noStudent;
    const className = request.className?.trim() || labels.noClass;
    const lines = [
      `${who} — ${className} — ${request.subject.trim()} — ${labels.doneCount(subjectDoneTotal(request, requests), request.subject.trim())}`,
      labels.pullTitle,
      ...(classPulls.length > 0
        ? classPulls.map((slot) => formatPlanTime(slot, true))
        : [labels.pullEmpty]),
      labels.subjectTitle,
      ...(classLessons.length > 0
        ? classLessons.map((slot) => formatSubjectLessonTime(slot, request.subject))
        : [labels.subjectEmpty]),
    ];
    return lines.join("\n");
  });
  return blocks.join("\n\n");
}
