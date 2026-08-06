import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTimetableCsv } from "@/lib/timetable/parse-csv";

test("wide timetable CSV keeps per-row כיתה instead of collapsing to filename", () => {
  const csv = [
    "כיתה,זמן,ראשון,שני",
    "יא1,08:00-08:45,מתמטיקה,אנגלית",
    "יא2,08:00-08:45,היסטוריה,פיזיקה",
  ].join("\n");

  const parsed = parseTimetableCsv(Buffer.from(csv, "utf8"), "מערכת-שעות.csv");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  const byClass = new Map<string, string[]>();
  for (const row of parsed.result.rows) {
    const subjects = byClass.get(row.className) ?? [];
    subjects.push(row.subject);
    byClass.set(row.className, subjects);
  }

  assert.deepEqual([...byClass.keys()].sort(), ["יא1", "יא2"]);
  assert.deepEqual(byClass.get("יא1"), ["מתמטיקה", "אנגלית"]);
  assert.deepEqual(byClass.get("יא2"), ["היסטוריה", "פיזיקה"]);
  assert.equal(
    parsed.result.rows.every((r) => r.className !== "מערכת שעות"),
    true
  );
});

test("wide timetable CSV without class column still falls back to filename", () => {
  const csv = ["זמן,ראשון", "08:00-08:45,מתמטיקה"].join("\n");

  const parsed = parseTimetableCsv(Buffer.from(csv, "utf8"), "class_y3.csv");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.result.rows.length, 1);
  assert.equal(parsed.result.rows[0]?.className, "Y3");
  assert.equal(parsed.result.rows[0]?.subject, "מתמטיקה");
});

test("wide timetable CSV warns when class column is present but empty", () => {
  const csv = [
    "כיתה,זמן,ראשון",
    ",08:00-08:45,מתמטיקה",
    "יא1,08:45-09:30,אנגלית",
  ].join("\n");

  const parsed = parseTimetableCsv(Buffer.from(csv, "utf8"), "schedule.csv");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.result.rows.length, 1);
  assert.equal(parsed.result.rows[0]?.className, "יא1");
  assert.equal(parsed.result.warnings.length, 1);
  assert.match(parsed.result.warnings[0] ?? "", /לא תקינה/);
});
