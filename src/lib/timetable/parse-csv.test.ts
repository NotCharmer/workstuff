import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTimetableCsv } from "@/lib/timetable/parse-csv";
import { TimetablePayloadSchema } from "@/lib/validators";

test("timetable CSV skips invalid rows into warnings instead of inventing entries", () => {
  const csv = [
    "className,dayOfWeek,startTime,endTime,subject",
    "Y3,ראשון,08:00,08:45,מתמטיקה",
    "Y3,ראשון,08:45,,אנגלית",
    "Y3,שני,09:00,09:45,היסטוריה",
  ].join("\n");

  const parsed = parseTimetableCsv(Buffer.from(csv, "utf8"), "y3.csv");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.result.rows.length, 2);
  assert.equal(parsed.result.warnings.length, 1);
  assert.match(parsed.result.warnings[0] ?? "", /לא תקינה/);
  assert.deepEqual(
    parsed.result.rows.map((r) => r.subject),
    ["מתמטיקה", "היסטוריה"]
  );
});

test("timetable confirm schema rejects whitespace-only required fields", () => {
  const parsed = TimetablePayloadSchema.safeParse({
    rows: [
      {
        id: "row-1",
        className: "   ",
        dayOfWeek: "ראשון",
        startTime: "08:00",
        endTime: "08:45",
        subject: "מתמטיקה",
      },
    ],
  });
  assert.equal(parsed.success, false);
});

test("timetable confirm schema accepts trimmed valid rows", () => {
  const parsed = TimetablePayloadSchema.safeParse({
    rows: [
      {
        id: "row-1",
        className: " Y3 ",
        dayOfWeek: " ראשון ",
        startTime: "08:00",
        endTime: "08:45",
        subject: " מתמטיקה ",
        teacher: null,
        room: null,
      },
    ],
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.rows[0]?.className, "Y3");
  assert.equal(parsed.data.rows[0]?.subject, "מתמטיקה");
});
