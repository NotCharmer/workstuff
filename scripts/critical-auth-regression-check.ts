import assert from "node:assert/strict";
import { assertCanModifyTask, type DailyTaskRecord } from "../src/lib/daily-task-access";
import { approvedBranchAccessIds } from "../src/lib/user-branches";
import type { CurrentUser } from "../src/lib/auth";

const branchId = "branch-a";

const staff = (id: string): CurrentUser => ({
  id,
  email: `${id}@example.com`,
  name: id,
  role: "STAFF",
  status: "ACTIVE",
  onboardingCompleted: true,
  branchId,
  branchCode: null,
  branchName: null,
});

const manager: CurrentUser = {
  ...staff("manager-1"),
  role: "BRANCH_MANAGER",
};

const generalTask: DailyTaskRecord = {
  id: "task-general",
  branchId,
  authorId: "staff-1",
  assigneeId: null,
  title: "General task",
  done: false,
  date: "2026-06-30",
};

const personalTask: DailyTaskRecord = {
  ...generalTask,
  id: "task-personal",
  assigneeId: "staff-1",
};

assert.deepEqual(approvedBranchAccessIds(branchId), [branchId]);
assert.deepEqual(approvedBranchAccessIds(null), []);

assert.doesNotThrow(() => assertCanModifyTask(staff("staff-2"), generalTask, { done: true }));
assert.doesNotThrow(() => assertCanModifyTask(staff("staff-1"), generalTask, { title: "Updated" }));
assert.doesNotThrow(() => assertCanModifyTask(manager, generalTask, { title: "Manager update" }));

assert.throws(
  () => assertCanModifyTask(staff("staff-2"), generalTask, { title: "Tampered" }),
  /FORBIDDEN/
);
assert.throws(
  () => assertCanModifyTask(staff("staff-2"), personalTask, { done: true }),
  /FORBIDDEN/
);

console.log("critical authorization regression checks passed");
