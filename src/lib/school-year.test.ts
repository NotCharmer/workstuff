import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  nextSchoolYear,
  normalizeClassName,
  parseHebrewClass,
  planStudentPromotions,
  promoteClassName,
} from "./school-year";

describe("promoteClassName", () => {
  it("promotes י → יא and יא → יב with numeric suffixes", () => {
    assert.deepEqual(promoteClassName("י12"), { kind: "promoted", next: "יא12" });
    assert.deepEqual(promoteClassName("יא 3"), { kind: "promoted", next: "יב3" });
    assert.deepEqual(promoteClassName("יב2"), { kind: "graduated", next: "יב2" });
  });

  it("leaves unrecognized or empty class names unchanged", () => {
    assert.deepEqual(promoteClassName(null), { kind: "unchanged", next: null });
    assert.deepEqual(promoteClassName(""), { kind: "unchanged", next: "" });
    assert.deepEqual(promoteClassName("10-B"), { kind: "unchanged", next: "10-B" });
  });
});

describe("parseHebrewClass / normalizeClassName", () => {
  it("strips spaces and prefers longer layer tokens", () => {
    assert.equal(normalizeClassName("יא 3"), "יא3");
    assert.deepEqual(parseHebrewClass("יב"), { layer: "יב", suffix: "" });
    assert.deepEqual(parseHebrewClass("י12"), { layer: "י", suffix: "12" });
  });
});

describe("nextSchoolYear", () => {
  it("advances a normal year string", () => {
    assert.equal(nextSchoolYear("2025-2026"), "2026-2027");
  });
});

describe("planStudentPromotions", () => {
  it("snapshots promotions so a retry cannot re-derive from already-promoted classes", () => {
    const plan = planStudentPromotions([
      { id: "a", className: "י1" },
      { id: "b", className: "יא1" },
      { id: "c", className: "יב1" },
      { id: "d", className: "misc" },
    ]);

    assert.deepEqual(plan.promoteTo.get("יא1"), ["a"]);
    assert.deepEqual(plan.promoteTo.get("יב1"), ["b"]);
    assert.deepEqual(plan.graduateIds, ["c"]);
    assert.deepEqual(plan.unchangedIds, ["d"]);

    // Simulates a corrupted retry that re-reads post-promotion class names:
    // planning again from already-promoted rows would advance a second time.
    const corruptRetry = planStudentPromotions([
      { id: "a", className: "יא1" },
      { id: "b", className: "יב1" },
    ]);
    assert.deepEqual(corruptRetry.promoteTo.get("יב1"), ["a"]);
    assert.deepEqual(corruptRetry.graduateIds, ["b"]);
  });
});
