// Shared day-of-week normalization. Used by the CSV parser (server) and the
// editable timetable grid (client) so that values stored in the DB always sort
// and render predictably regardless of source (Hebrew, English, "יום X" form,
// single-letter shorthand, etc.).

const norm = (s: string) =>
  s
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const DAY_CANONICAL_ORDER = [
  "ראשון",
  "שני",
  "שלישי",
  "רביעי",
  "חמישי",
  "שישי",
  "שבת",
] as const;

export type CanonicalDay = (typeof DAY_CANONICAL_ORDER)[number];

const DAY_LOOKUP: Record<string, CanonicalDay> = {
  ראשון: "ראשון",
  "יום ראשון": "ראשון",
  sunday: "ראשון",
  sun: "ראשון",
  "א": "ראשון",
  "א'": "ראשון",
  שני: "שני",
  "יום שני": "שני",
  monday: "שני",
  mon: "שני",
  "ב": "שני",
  "ב'": "שני",
  שלישי: "שלישי",
  "יום שלישי": "שלישי",
  tuesday: "שלישי",
  tue: "שלישי",
  tues: "שלישי",
  "ג": "שלישי",
  "ג'": "שלישי",
  רביעי: "רביעי",
  "יום רביעי": "רביעי",
  wednesday: "רביעי",
  wed: "רביעי",
  "ד": "רביעי",
  "ד'": "רביעי",
  חמישי: "חמישי",
  "יום חמישי": "חמישי",
  thursday: "חמישי",
  thu: "חמישי",
  thur: "חמישי",
  thurs: "חמישי",
  "ה": "חמישי",
  "ה'": "חמישי",
  שישי: "שישי",
  "יום שישי": "שישי",
  friday: "שישי",
  fri: "שישי",
  "ו": "שישי",
  "ו'": "שישי",
  שבת: "שבת",
  "יום שבת": "שבת",
  saturday: "שבת",
  sat: "שבת",
  "ש": "שבת",
  "ש'": "שבת",
};

export function canonicalDay(input: string): string {
  if (!input) return "";
  return DAY_LOOKUP[norm(input)] ?? input.trim();
}

export function isCanonicalDayInput(input: string): boolean {
  return Boolean(DAY_LOOKUP[norm(input)]);
}

export const DAY_ORDER: Record<string, number> = DAY_CANONICAL_ORDER.reduce(
  (acc, day, i) => {
    acc[day] = i + 1;
    return acc;
  },
  {} as Record<string, number>
);

// Lookup that is tolerant of legacy/non-canonical values still in the database.
export function dayOrderOf(input: string): number {
  const canon = canonicalDay(input);
  return DAY_ORDER[canon] ?? 99;
}
