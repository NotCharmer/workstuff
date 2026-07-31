import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isCurrentSchoolYearGrade } from "./school-year";

describe("isCurrentSchoolYearGrade", () => {
  it("allows deletes for the active school year", () => {
    assert.equal(isCurrentSchoolYearGrade("2026-2027", "2026-2027"), true);
  });

  it("blocks deletes for archived school years", () => {
    assert.equal(isCurrentSchoolYearGrade("2025-2026", "2026-2027"), false);
    assert.equal(isCurrentSchoolYearGrade("2024-2025", "2026-2027"), false);
  });

  it("treats untagged grades as belonging to the active year", () => {
    assert.equal(isCurrentSchoolYearGrade(null, "2026-2027"), true);
    assert.equal(isCurrentSchoolYearGrade(undefined, "2026-2027"), true);
    assert.equal(isCurrentSchoolYearGrade("", "2026-2027"), true);
  });
});
