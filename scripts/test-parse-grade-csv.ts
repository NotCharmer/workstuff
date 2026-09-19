import assert from "node:assert/strict";
import { parseGradeCsv } from "../src/lib/csv/parse-grade-csv";

function parse(csv: string, fileName = "grades.csv") {
  const result = parseGradeCsv(Buffer.from(csv, "utf8"), fileName);
  assert.equal(result.ok, true, result.ok ? undefined : result.error);
  return result.result;
}

const serialAndRange = parse(`מספר,שם התלמיד,מקצוע,ציון
1,דנה כהן,פייתון,95
2,רן לוי,פייתון,120
3,גל מור,פייתון,-5
`);

assert.equal(serialAndRange.rows.length, 1);
assert.equal(serialAndRange.rows[0].studentName, "דנה כהן");
assert.equal(serialAndRange.rows[0].externalId, null);
assert.equal(serialAndRange.rows[0].grade, 95);
assert.equal(serialAndRange.warnings.length, 2);
assert.match(serialAndRange.warnings.join("\n"), /120/);
assert.match(serialAndRange.warnings.join("\n"), /-5/);

const explicitStudentNumber = parse(`מספר תלמיד,שם התלמיד,מקצוע,ציון
98765,דנה כהן,פייתון,95
`);

assert.equal(explicitStudentNumber.rows.length, 1);
assert.equal(explicitStudentNumber.rows[0].externalId, "98765");

const englishLong = parse(`studentName,subject,grade
Ada Lovelace,Python,88
`);

assert.equal(englishLong.rows.length, 1);
assert.equal(englishLong.rows[0].subject, "Python");
assert.equal(englishLong.rows[0].grade, 88);

const wideExport = parse(`שם התלמיד,מקצוע,מחצית א,מחצית ב
דנה כהן,פייתון,101,92
`);

assert.equal(wideExport.rows.length, 1);
assert.equal(wideExport.rows[0].subject, "פייתון - מחצית ב");
assert.equal(wideExport.rows[0].grade, 92);
assert.equal(wideExport.warnings.length, 1);
assert.match(wideExport.warnings[0], /101/);

