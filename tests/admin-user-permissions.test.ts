import assert from "node:assert/strict";
import test from "node:test";
import { canPatchAdminUser } from "../src/lib/admin-user-permissions";

const branchManager = { role: "BRANCH_MANAGER" as const, branchId: "branch-a" };
const sameBranchStaff = { role: "STAFF", branchId: "branch-a" };

test("admins can patch roles, status, branches, and passwords", () => {
  assert.equal(
    canPatchAdminUser(
      { role: "ADMIN", branchId: null },
      sameBranchStaff,
      { role: "BRANCH_MANAGER", status: "ACTIVE", branchId: "branch-b", password: "ChangeMe123!" }
    ),
    true
  );
});

test("branch managers cannot promote same-branch staff", () => {
  assert.equal(canPatchAdminUser(branchManager, sameBranchStaff, { role: "BRANCH_MANAGER" }), false);
});

test("branch managers cannot change user status through the admin endpoint", () => {
  assert.equal(canPatchAdminUser(branchManager, sameBranchStaff, { status: "ACTIVE" }), false);
  assert.equal(canPatchAdminUser(branchManager, sameBranchStaff, { status: "BLOCKED" }), false);
});

test("branch managers cannot move users between branches", () => {
  assert.equal(canPatchAdminUser(branchManager, sameBranchStaff, { branchId: "branch-b" }), false);
});

test("branch managers can only patch same-branch non-admin passwords", () => {
  assert.equal(canPatchAdminUser(branchManager, sameBranchStaff, { password: "ChangeMe123!" }), true);
  assert.equal(
    canPatchAdminUser(branchManager, { role: "STAFF", branchId: "branch-b" }, { password: "ChangeMe123!" }),
    false
  );
  assert.equal(
    canPatchAdminUser(branchManager, { role: "ADMIN", branchId: "branch-a" }, { password: "ChangeMe123!" }),
    false
  );
});
