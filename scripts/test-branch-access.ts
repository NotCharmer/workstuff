import assert from "node:assert/strict";
import { resolveApprovedBranchIds } from "../src/lib/user-branches";

assert.deepEqual(
  resolveApprovedBranchIds({
    primaryBranchId: "branch-a",
    requestedBranchCode: "rehovot,tel-aviv",
    accessBranchIds: ["branch-a", "branch-b"],
  }),
  ["branch-a"],
  "self-registration requests must not approve every requested branch"
);

assert.deepEqual(
  resolveApprovedBranchIds({
    primaryBranchId: "branch-a",
    requestedBranchCode: null,
    accessBranchIds: ["branch-a", "branch-b", "branch-a"],
  }),
  ["branch-a", "branch-b"],
  "explicit branch access rows should remain available for non-registration users"
);

assert.deepEqual(
  resolveApprovedBranchIds({
    primaryBranchId: null,
    requestedBranchCode: "rehovot",
    accessBranchIds: ["branch-a"],
  }),
  [],
  "requested branches should not become access without an approved primary branch"
);

console.log("branch access checks passed");
