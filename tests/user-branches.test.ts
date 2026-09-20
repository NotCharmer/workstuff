import assert from "node:assert/strict";
import test from "node:test";
import { resolveAccessibleBranchIds } from "../src/lib/user-branches";

test("requested branches do not grant cross-branch access before approval", () => {
  assert.deepEqual(
    resolveAccessibleBranchIds({
      branchId: "branch-a",
      requestedBranchCode: "school-a,school-b",
      accessBranchIds: ["branch-a", "branch-b"],
    }),
    ["branch-a"]
  );
});

test("explicit branch access remains available after requests are approved", () => {
  assert.deepEqual(
    resolveAccessibleBranchIds({
      branchId: "branch-a",
      requestedBranchCode: null,
      accessBranchIds: ["branch-a", "branch-b", "branch-b"],
    }),
    ["branch-a", "branch-b"]
  );
});

test("a request without an assigned primary branch grants no access", () => {
  assert.deepEqual(
    resolveAccessibleBranchIds({
      branchId: null,
      requestedBranchCode: "school-a",
      accessBranchIds: ["branch-a"],
    }),
    []
  );
});
