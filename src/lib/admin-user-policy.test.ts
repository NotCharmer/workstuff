import assert from "node:assert/strict";
import { getAdminUserPatchForbiddenReason } from "./admin-user-policy";

const branchManager = { role: "BRANCH_MANAGER" as const, branchId: "branch-a" };
const staffInBranch = { role: "STAFF" as const, branchId: "branch-a" };

assert.equal(
  getAdminUserPatchForbiddenReason(branchManager, staffInBranch, { role: "BRANCH_MANAGER" }),
  "Forbidden",
  "branch managers must not be able to promote staff to branch manager"
);

assert.equal(
  getAdminUserPatchForbiddenReason(branchManager, staffInBranch, { status: "ACTIVE" }),
  null,
  "branch managers can still approve same-branch staff"
);

assert.equal(
  getAdminUserPatchForbiddenReason(branchManager, staffInBranch, { status: "BLOCKED" }),
  "Forbidden",
  "branch managers must not be able to block users"
);

assert.equal(
  getAdminUserPatchForbiddenReason(
    branchManager,
    { role: "STAFF" as const, branchId: "branch-b" },
    { status: "ACTIVE" }
  ),
  "Forbidden",
  "branch managers must not be able to change other branches"
);

assert.equal(
  getAdminUserPatchForbiddenReason(
    { role: "ADMIN" as const, branchId: null },
    staffInBranch,
    { role: "BRANCH_MANAGER", branchId: "branch-b", status: "BLOCKED" }
  ),
  null,
  "admins retain full user-management permissions"
);
