import assert from "node:assert/strict";
import test from "node:test";
import { chooseApprovedBranchIdsForActivation } from "./user-branch-approval";

test("branch managers only approve their own branch", () => {
  assert.deepEqual(
    chooseApprovedBranchIdsForActivation({
      actorRole: "BRANCH_MANAGER",
      actorBranchId: "branch-a",
      targetBranchId: "branch-a",
      requestedBranchIds: ["branch-a", "branch-b"],
    }),
    ["branch-a"]
  );
});

test("admins can approve the requested branch set", () => {
  assert.deepEqual(
    chooseApprovedBranchIdsForActivation({
      actorRole: "ADMIN",
      actorBranchId: null,
      targetBranchId: "branch-a",
      requestedBranchIds: ["branch-a", "branch-b"],
    }),
    ["branch-a", "branch-b"]
  );
});

test("explicit admin branch assignment is included in approved access", () => {
  assert.deepEqual(
    chooseApprovedBranchIdsForActivation({
      actorRole: "ADMIN",
      actorBranchId: null,
      targetBranchId: "branch-a",
      branchIdOverride: "branch-c",
      requestedBranchIds: ["branch-a", "branch-b"],
    }),
    ["branch-c", "branch-a", "branch-b"]
  );
});
