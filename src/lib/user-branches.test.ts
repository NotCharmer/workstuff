import assert from "node:assert/strict";
import { test } from "node:test";
import { approvedBranchIdsForUser } from "@/lib/user-branches";

test("only active non-admin users receive effective branch access", () => {
  assert.deepEqual(
    approvedBranchIdsForUser({
      id: "pending-user",
      role: "STAFF",
      status: "PENDING",
      branchId: "branch-a",
    }),
    []
  );

  assert.deepEqual(
    approvedBranchIdsForUser({
      id: "active-user",
      role: "STAFF",
      status: "ACTIVE",
      branchId: "branch-a",
    }),
    ["branch-a"]
  );

  assert.deepEqual(
    approvedBranchIdsForUser({
      id: "admin-user",
      role: "ADMIN",
      status: "ACTIVE",
      branchId: "branch-a",
    }),
    []
  );
});
