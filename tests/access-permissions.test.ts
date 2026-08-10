import assert from "node:assert/strict";
import test from "node:test";

import type { CurrentUser } from "../src/lib/auth";
import { assertCanDeleteTask, type DailyTaskRecord } from "../src/lib/daily-task-access";
import { getAuthorizedActivationBranchIds } from "../src/lib/user-branches";

function user(overrides: Partial<CurrentUser>): CurrentUser {
  return {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "STAFF",
    status: "ACTIVE",
    onboardingCompleted: true,
    branchId: "branch-a",
    branchCode: "branch-a",
    branchName: "Branch A",
    ...overrides,
  };
}

function task(overrides: Partial<DailyTaskRecord>): DailyTaskRecord {
  return {
    id: "task-1",
    branchId: "branch-a",
    authorId: "manager-1",
    assigneeId: "staff-1",
    title: "Assigned task",
    done: false,
    date: "2026-06-12",
    ...overrides,
  };
}

test("staff cannot delete a personal task assigned by someone else", () => {
  assert.throws(() => assertCanDeleteTask(user({ id: "staff-1" }), task({})), /FORBIDDEN/);
});

test("staff can delete a personal task they authored", () => {
  assert.doesNotThrow(() =>
    assertCanDeleteTask(user({ id: "staff-1" }), task({ authorId: "staff-1" }))
  );
});

test("managers can delete tasks in their branch regardless of author", () => {
  assert.doesNotThrow(() =>
    assertCanDeleteTask(
      user({ id: "manager-1", role: "BRANCH_MANAGER" }),
      task({ authorId: "other-manager", assigneeId: "staff-1" })
    )
  );
});

test("branch managers can only grant their own branch on activation", () => {
  assert.deepEqual(
    getAuthorizedActivationBranchIds(
      { role: "BRANCH_MANAGER", branchId: "branch-a" },
      "branch-a",
      ["branch-a", "branch-b"]
    ),
    ["branch-a"]
  );
});

test("admins grant requested branches plus the primary branch on activation", () => {
  assert.deepEqual(
    getAuthorizedActivationBranchIds(
      { role: "ADMIN", branchId: null },
      "branch-a",
      ["branch-a", "branch-b"]
    ),
    ["branch-a", "branch-b"]
  );
});
