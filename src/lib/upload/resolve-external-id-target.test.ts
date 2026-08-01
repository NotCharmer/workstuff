import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveExternalIdUploadTarget } from "./resolve-external-id-target";

describe("resolveExternalIdUploadTarget", () => {
  it("uses an ACTIVE student when present", () => {
    assert.deepEqual(
      resolveExternalIdUploadTarget({ activeMatch: true, graduatedMatch: true }),
      { kind: "active" }
    );
    assert.deepEqual(
      resolveExternalIdUploadTarget({ activeMatch: true, graduatedMatch: false }),
      { kind: "active" }
    );
  });

  it("skips when only a GRADUATED student holds the externalId", () => {
    assert.deepEqual(
      resolveExternalIdUploadTarget({ activeMatch: false, graduatedMatch: true }),
      { kind: "skip_graduated" }
    );
  });

  it("creates when no student owns the externalId", () => {
    assert.deepEqual(
      resolveExternalIdUploadTarget({ activeMatch: false, graduatedMatch: false }),
      { kind: "create" }
    );
  });
});
