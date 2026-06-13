import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGradeCsv } from "@/lib/csv/parse-grade-csv";

test("wide CSV uses identity column instead of serial number as externalId", () => {
  const csv = [
    "מספר,שם התלמיד,ת.ז,מקצוע,כיתה,מבחן",
    "1,נועה כהן,123456789,מתמטיקה,י1,95",
  ].join("\n");

  const result = parseGradeCsv(Buffer.from(csv, "utf8"), "grades.csv");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.result.rows.length, 1);
  assert.equal(result.result.rows[0]?.externalId, "123456789");
});

test("wide CSV does not treat a serial-only column as externalId", () => {
  const csv = [
    "מספר,שם התלמיד,מקצוע,כיתה,ציון",
    "1,נועה כהן,מתמטיקה,י1,95",
  ].join("\n");

  const result = parseGradeCsv(Buffer.from(csv, "utf8"), "grades.csv");

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.result.rows.length, 1);
  assert.equal(result.result.rows[0]?.externalId, null);
});
