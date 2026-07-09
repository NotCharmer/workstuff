import assert from "node:assert/strict";

import type { CurrentUser } from "../src/lib/auth";
import type { DailyTaskRecord } from "../src/lib/daily-task-access";

process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/db";

function user(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: "staff-1",
    email: "staff@example.com",
    name: "Staff",
    role: "STAFF",
    status: "ACTIVE",
    onboardingCompleted: true,
    branchId: "branch-1",
    branchCode: "branch",
    branchName: "Branch",
    ...overrides,
  };
}

function task(overrides: Partial<DailyTaskRecord> = {}): DailyTaskRecord {
  return {
    id: "task-1",
    branchId: "branch-1",
    authorId: "author-1",
    assigneeId: null,
    title: "Shared branch task",
    done: false,
    date: "2026-07-09",
    ...overrides,
  };
}

async function testDailyTaskPatchAuthorization() {
  const { assertCanModifyTask } = await import("../src/lib/daily-task-access");

  const staff = user();
  const sharedTaskByOther = task();

  assert.doesNotThrow(() =>
    assertCanModifyTask(staff, sharedTaskByOther, { done: true })
  );

  assert.throws(
    () => assertCanModifyTask(staff, sharedTaskByOther, { title: "Changed" }),
    /FORBIDDEN/
  );

  assert.doesNotThrow(() =>
    assertCanModifyTask(user({ id: "author-1" }), sharedTaskByOther, { title: "Changed" })
  );

  assert.doesNotThrow(() =>
    assertCanModifyTask(user({ role: "BRANCH_MANAGER" }), sharedTaskByOther, {
      title: "Changed",
    })
  );
}

async function testStudentListSubjectCoverage() {
  const {
    TARGET_SUBJECT_TOKENS,
    STUDENT_LIST_SUBJECT_TOKENS,
    isStudentListSubject,
  } = await import("../src/lib/upload/target-subjects");

  for (const token of TARGET_SUBJECT_TOKENS) {
    assert.ok(
      STUDENT_LIST_SUBJECT_TOKENS.includes(token),
      `students list filter is missing upload target token ${token}`
    );
  }

  assert.ok(isStudentListSubject("חשמל"));
  assert.ok(isStudentListSubject("פרויקט גמר"));
  assert.ok(isStudentListSubject("Python"));
}

async function main() {
  await testDailyTaskPatchAuthorization();
  await testStudentListSubjectCoverage();

  console.log("critical regression checks passed");
}

void main();
