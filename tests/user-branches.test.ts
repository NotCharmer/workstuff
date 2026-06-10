import assert from "node:assert/strict";
import test from "node:test";
import { branchAccessExceedsScope } from "../src/lib/user-branches";

test("branchAccessExceedsScope allows users without explicit access rows", () => {
  assert.equal(branchAccessExceedsScope([], "branch-a"), false);
});

test("branchAccessExceedsScope allows access limited to the manager branch", () => {
  assert.equal(branchAccessExceedsScope(["branch-a"], "branch-a"), false);
});

test("branchAccessExceedsScope detects access outside the manager branch", () => {
  assert.equal(branchAccessExceedsScope(["branch-a", "branch-b"], "branch-a"), true);
});
