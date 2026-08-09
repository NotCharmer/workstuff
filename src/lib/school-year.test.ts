import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeClassName,
  parseHebrewClass,
  planTimetableClassAction,
  promoteClassName,
} from "./school-year";

describe("normalizeClassName", () => {
  it("strips whitespace and Hebrew/ASCII quotation marks used in class labels", () => {
    assert.equal(normalizeClassName("יא 3"), "יא3");
    assert.equal(normalizeClassName("י' 3"), "י3");
    assert.equal(normalizeClassName("י׳3"), "י3");
    assert.equal(normalizeClassName("י״א 2"), "יא2");
    assert.equal(normalizeClassName('י"ב2'), "יב2");
    assert.equal(normalizeClassName("יא'"), "יא");
  });
});

describe("parseHebrewClass", () => {
  it("parses quoted and spaced Hebrew class labels", () => {
    assert.deepEqual(parseHebrewClass("י' 3"), { layer: "י", suffix: "3" });
    assert.deepEqual(parseHebrewClass("י׳12"), { layer: "י", suffix: "12" });
    assert.deepEqual(parseHebrewClass("יא'"), { layer: "יא", suffix: "" });
    assert.deepEqual(parseHebrewClass("י״ב2"), { layer: "יב", suffix: "2" });
    assert.deepEqual(parseHebrewClass("יב"), { layer: "יב", suffix: "" });
  });
});

describe("promoteClassName", () => {
  it("promotes and graduates quoted Hebrew class labels used in the product UI", () => {
    assert.deepEqual(promoteClassName("י' 3"), { kind: "promoted", next: "יא3" });
    assert.deepEqual(promoteClassName("יא׳2"), { kind: "promoted", next: "יב2" });
    assert.deepEqual(promoteClassName("י״א"), { kind: "promoted", next: "יב" });
    assert.deepEqual(promoteClassName("יב' 1"), { kind: "graduated", next: "יב' 1" });
    assert.deepEqual(promoteClassName('י"ב2'), { kind: "graduated", next: 'י"ב2' });
  });

  it("keeps already-clean labels working", () => {
    assert.deepEqual(promoteClassName("י12"), { kind: "promoted", next: "יא12" });
    assert.deepEqual(promoteClassName("יא3"), { kind: "promoted", next: "יב3" });
    assert.deepEqual(promoteClassName("יב2"), { kind: "graduated", next: "יב2" });
  });
});

describe("planTimetableClassAction", () => {
  it("moves live timetable labels with the cohort and drops graduated grids", () => {
    assert.deepEqual(planTimetableClassAction("י3"), { kind: "promote", next: "יא3" });
    assert.deepEqual(planTimetableClassAction("יא 3"), { kind: "promote", next: "יב3" });
    assert.deepEqual(planTimetableClassAction("י' 3"), { kind: "promote", next: "יא3" });
    assert.deepEqual(planTimetableClassAction("יב2"), { kind: "delete" });
    assert.deepEqual(planTimetableClassAction("יב' 1"), { kind: "delete" });
  });

  it("keeps unparseable class labels unchanged so custom rooms are not wiped", () => {
    assert.deepEqual(planTimetableClassAction("מעבדה א"), { kind: "keep" });
    assert.deepEqual(planTimetableClassAction(""), { kind: "keep" });
  });
});
