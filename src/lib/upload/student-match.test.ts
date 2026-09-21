import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classNamesForUploadLookup,
  pickUniqueNameMatch,
  shouldUpdateClassNameFromUpload,
} from "./student-match";

describe("classNamesForUploadLookup", () => {
  it("includes the promoted class after school-year rollover", () => {
    assert.deepEqual(classNamesForUploadLookup("י3"), ["י3", "יא3"]);
    assert.deepEqual(classNamesForUploadLookup("יא12"), ["יא12", "יב12"]);
  });

  it("normalizes spaced class labels", () => {
    assert.deepEqual(classNamesForUploadLookup("יא 3"), ["יא 3", "יא3", "יב3"]);
  });

  it("returns empty for missing class", () => {
    assert.deepEqual(classNamesForUploadLookup(null), []);
    assert.deepEqual(classNamesForUploadLookup("  "), []);
  });
});

describe("shouldUpdateClassNameFromUpload", () => {
  it("fills a missing className", () => {
    assert.equal(shouldUpdateClassNameFromUpload(null, "יא3"), true);
    assert.equal(shouldUpdateClassNameFromUpload("", "יא3"), true);
  });

  it("never demotes a promoted class from a stale CSV", () => {
    assert.equal(shouldUpdateClassNameFromUpload("יא3", "י3"), false);
    assert.equal(shouldUpdateClassNameFromUpload("יב2", "יא2"), false);
  });

  it("allows same-layer section transfers and promotions", () => {
    assert.equal(shouldUpdateClassNameFromUpload("יא3", "יא5"), true);
    assert.equal(shouldUpdateClassNameFromUpload("י3", "יא3"), true);
  });

  it("skips no-op and unparseable overwrites", () => {
    assert.equal(shouldUpdateClassNameFromUpload("יא3", "יא 3"), false);
    assert.equal(shouldUpdateClassNameFromUpload("LAB-A", "LAB-B"), false);
    assert.equal(shouldUpdateClassNameFromUpload("יא3", ""), false);
  });
});

describe("pickUniqueNameMatch", () => {
  it("returns the only candidate", () => {
    assert.deepEqual(pickUniqueNameMatch([{ id: "a" }]), { id: "a" });
  });

  it("rejects ambiguous or empty sets", () => {
    assert.equal(pickUniqueNameMatch([]), null);
    assert.equal(pickUniqueNameMatch([{ id: "a" }, { id: "b" }]), null);
  });
});
