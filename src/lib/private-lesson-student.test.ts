import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canCreatePrivateLessonForStudent } from "./private-lesson-student";

describe("canCreatePrivateLessonForStudent", () => {
  it("allows ACTIVE students", () => {
    assert.equal(canCreatePrivateLessonForStudent("ACTIVE"), true);
  });

  it("rejects GRADUATED students (post-rollover class-label overlap)", () => {
    assert.equal(canCreatePrivateLessonForStudent("GRADUATED"), false);
  });

  it("rejects missing or unknown status", () => {
    assert.equal(canCreatePrivateLessonForStudent(null), false);
    assert.equal(canCreatePrivateLessonForStudent(undefined), false);
    assert.equal(canCreatePrivateLessonForStudent(""), false);
    assert.equal(canCreatePrivateLessonForStudent("PENDING"), false);
  });
});
