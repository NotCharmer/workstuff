import assert from "node:assert/strict";
import test from "node:test";
import { isLegacySharedStaffPassword } from "../src/lib/default-credentials";
import { getDefaultStaffPassword } from "../src/lib/server-env";
import { TeamUserCreateSchema } from "../src/lib/validators";

test("team invites require a private temporary password", () => {
  assert.equal(
    TeamUserCreateSchema.safeParse({ email: "staff@example.com" }).success,
    false
  );
  assert.equal(
    TeamUserCreateSchema.safeParse({
      email: "staff@example.com",
      password: "PrivateInvite123!",
    }).success,
    true
  );
});

test("legacy shared first-login password is recognized", () => {
  const sharedPassword = getDefaultStaffPassword();

  assert.equal(isLegacySharedStaffPassword(sharedPassword), true);
  assert.equal(isLegacySharedStaffPassword(`${sharedPassword}-private`), false);
});
