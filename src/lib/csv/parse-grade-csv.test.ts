import assert from "node:assert/strict";
import test from "node:test";
import { parseGradeCsv } from "./parse-grade-csv";

function parseRows(csv: string) {
  const parsed = parseGradeCsv(Buffer.from(csv, "utf-8"), "grades.csv");
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.result;
}

test("does not import student number metadata as a grade", () => {
  const result = parseRows(
    [
      "studentName,studentNumber,subject,grade",
      "Alice Example,2024001847,Math,93",
      "",
    ].join("\n")
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].studentName, "Alice Example");
  assert.equal(result.rows[0].externalId, "2024001847");
  assert.equal(result.rows[0].subject, "Math");
  assert.equal(result.rows[0].grade, 93);
});

test("does not import row numbers or grade levels as grades", () => {
  const result = parseRows(
    [
      "#,studentName,subject,gradeLevel,grade",
      "1,Alice Example,Math,10,88",
      "",
    ].join("\n")
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].subject, "Math");
  assert.equal(result.rows[0].grade, 88);
  assert.equal(result.rows[0].className, "10");
});

test("rejects out-of-range grades instead of clamping them", () => {
  const result = parseRows(
    [
      "studentName,subject,grade",
      "Alice Example,Math,105",
      "Bob Example,English,99",
      "",
    ].join("\n")
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].studentName, "Bob Example");
  assert.equal(result.rows[0].grade, 99);
  assert.ok(result.warnings.some((warning) => warning.includes("105")));
});
