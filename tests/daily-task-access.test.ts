import assert from "node:assert/strict";
import type { CurrentUser } from "../src/lib/auth";
import {
  assertCanModifyTask,
  type DailyTaskPatch,
  type DailyTaskRecord,
} from "../src/lib/daily-task-access";
import type { UserRole } from "../src/lib/enums";

function user(id: string, role: UserRole = "STAFF"): CurrentUser {
  return {
    id,
    email: `${id}@example.com`,
    name: id,
    role,
    status: "ACTIVE",
    onboardingCompleted: true,
    branchId: "branch-1",
    branchCode: "branch",
    branchName: "Branch",
  };
}

function task(overrides: Partial<DailyTaskRecord>): DailyTaskRecord {
  return {
    id: "task-1",
    branchId: "branch-1",
    authorId: "manager-1",
    assigneeId: null,
    title: "Prepare daily classroom checklist",
    done: false,
    date: "2026-07-13",
    ...overrides,
  };
}

function assertAllowed(
  actor: CurrentUser,
  record: DailyTaskRecord,
  patch: DailyTaskPatch
) {
  assert.doesNotThrow(() => assertCanModifyTask(actor, record, patch));
}

function assertForbidden(
  actor: CurrentUser,
  record: DailyTaskRecord,
  patch: DailyTaskPatch
) {
  assert.throws(() => assertCanModifyTask(actor, record, patch), /FORBIDDEN/);
}

const staff = user("staff-1");
const manager = user("manager-1", "BRANCH_MANAGER");

const sharedTask = task({ assigneeId: null, authorId: "manager-1" });
assertAllowed(staff, sharedTask, { done: true });
assertForbidden(staff, sharedTask, { title: "Overwritten by staff" });

const staffAuthoredSharedTask = task({ assigneeId: null, authorId: "staff-1" });
assertAllowed(staff, staffAuthoredSharedTask, { title: "Updated by author" });

const assignedByManager = task({ authorId: "manager-1", assigneeId: "staff-1" });
assertAllowed(staff, assignedByManager, { done: true });
assertForbidden(staff, assignedByManager, { title: "Changed assignment text" });

assertAllowed(manager, assignedByManager, { title: "Manager update", done: true });

console.log("daily-task-access permissions ok");
