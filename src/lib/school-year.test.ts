import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeClassName,
  parseHebrewClass,
  promoteClassName,
} from "./school-year";

describe("normalizeClassName", () => {
  it("strips whitespace, quotation marks, and hyphen/dot separators", () => {
    assert.equal(normalizeClassName("יא 3"), "יא3");
    assert.equal(normalizeClassName("י' 3"), "י3");
    assert.equal(normalizeClassName("י׳3"), "י3");
    assert.equal(normalizeClassName("י״א 2"), "יא2");
    assert.equal(normalizeClassName('י"ב2'), "יב2");
    assert.equal(normalizeClassName("יא'"), "יא");
    assert.equal(normalizeClassName('י"א-3'), "יא3");
    assert.equal(normalizeClassName("יא-3"), "יא3");
    assert.equal(normalizeClassName("י-12"), "י12");
    assert.equal(normalizeClassName("י.3"), "י3");
    assert.equal(normalizeClassName("יא־2"), "יא2");
  });
});

describe("parseHebrewClass", () => {
  it("parses quoted, spaced, and hyphenated Hebrew class labels", () => {
    assert.deepEqual(parseHebrewClass("י' 3"), { layer: "י", suffix: "3" });
    assert.deepEqual(parseHebrewClass("י׳12"), { layer: "י", suffix: "12" });
    assert.deepEqual(parseHebrewClass("יא'"), { layer: "יא", suffix: "" });
    assert.deepEqual(parseHebrewClass("י״ב2"), { layer: "יב", suffix: "2" });
    assert.deepEqual(parseHebrewClass("יב"), { layer: "יב", suffix: "" });
    assert.deepEqual(parseHebrewClass('י"א-3'), { layer: "יא", suffix: "3" });
    assert.deepEqual(parseHebrewClass("יא-3"), { layer: "יא", suffix: "3" });
    assert.deepEqual(parseHebrewClass("י.12"), { layer: "י", suffix: "12" });
  });
});

describe("promoteClassName", () => {
  it("promotes and graduates the official CSV template class format", () => {
    assert.deepEqual(promoteClassName('י"א-3'), { kind: "promoted", next: "יב3" });
    assert.deepEqual(promoteClassName('י"ב-2'), { kind: "graduated", next: 'י"ב-2' });
    assert.deepEqual(promoteClassName("י-1"), { kind: "promoted", next: "יא1" });
  });

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
