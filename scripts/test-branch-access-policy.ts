import assert from "node:assert/strict";
import {
  approvedBranchAccessIds,
  trustedBranchAccessIdsForUser,
} from "../src/lib/user-branches";

assert.deepEqual(approvedBranchAccessIds("branch-a"), ["branch-a"]);
assert.deepEqual(approvedBranchAccessIds(null), []);

assert.deepEqual(
  trustedBranchAccessIdsForUser(null, ["branch-a", "branch-b", "branch-a"]),
  ["branch-a", "branch-b"],
  "manual branch access rows remain trusted for users without self-registration requests"
);

assert.deepEqual(
  trustedBranchAccessIdsForUser(
    { branchId: "branch-a", requestedBranchCode: "rehovot,tel-aviv" },
    ["branch-a", "branch-b"]
  ),
  ["branch-a"],
  "self-registration requests must not grant every requested branch"
);

assert.deepEqual(
  trustedBranchAccessIdsForUser(
    { branchId: "branch-a", requestedBranchCode: "rehovot,tel-aviv" },
    ["branch-a"]
  ),
  ["branch-a"],
  "approved self-registered users keep the single reviewed branch"
);

assert.deepEqual(
  trustedBranchAccessIdsForUser(
    { branchId: null, requestedBranchCode: "rehovot,tel-aviv" },
    ["branch-a"]
  ),
  [],
  "self-registered users without an approved branch get no branch access"
);

console.log("branch access policy tests passed");
