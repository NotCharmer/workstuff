import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@/lib/db";

process.env.ALLOWED_GOOGLE_EMAILS = "person@example.com";

const { authOptions } = await import("./auth-options");

test("google sign-in provisions an allowed user by normalized email", async () => {
  const originalUpsert = prisma.user.upsert;
  let upsertArgs: unknown;

  try {
    (prisma.user.upsert as any) = async (args: unknown) => {
      upsertArgs = args;
      return { id: "db-user-id" };
    };

    const result = await (authOptions.callbacks?.signIn as any)({
      user: { email: "Person@Example.com", name: "Person" },
      account: { provider: "google" },
      profile: { name: "Profile Name" },
    });

    assert.equal(result, true);
    assert.deepEqual(upsertArgs, {
      where: { email: "person@example.com" },
      update: { name: "Person" },
      create: {
        email: "person@example.com",
        name: "Person",
        role: "STAFF",
        status: "PENDING",
        onboardingCompleted: false,
      },
      include: { branch: true },
    });
  } finally {
    (prisma.user.upsert as any) = originalUpsert;
  }
});

test("jwt refresh replaces provider subject with the database user id", async () => {
  const originalFindUnique = prisma.user.findUnique;

  try {
    (prisma.user.findUnique as any) = async () => ({
      id: "db-user-id",
      role: "ADMIN",
      status: "ACTIVE",
      onboardingCompleted: true,
      branchId: "branch-id",
      branch: { code: "main", name: "Main Branch" },
    });

    const token = await (authOptions.callbacks?.jwt as any)({
      token: { email: "Person@Example.com", sub: "google-subject" },
    });

    assert.equal(token.sub, "db-user-id");
    assert.equal(token.role, "ADMIN");
    assert.equal(token.status, "ACTIVE");
    assert.equal(token.onboardingCompleted, true);
    assert.equal(token.branchId, "branch-id");
    assert.equal(token.branchCode, "main");
    assert.equal(token.branchName, "Main Branch");
  } finally {
    (prisma.user.findUnique as any) = originalFindUnique;
  }
});

test("jwt refresh clears usable claims when the database user is gone", async () => {
  const originalFindUnique = prisma.user.findUnique;

  try {
    (prisma.user.findUnique as any) = async () => null;

    const token = await (authOptions.callbacks?.jwt as any)({
      token: {
        email: "missing@example.com",
        sub: "old-db-id",
        role: "ADMIN",
        status: "ACTIVE",
        onboardingCompleted: true,
        branchId: "branch-id",
        branchCode: "main",
        branchName: "Main Branch",
      },
    });

    assert.equal(token.sub, "");
    assert.equal(token.role, "STAFF");
    assert.equal(token.status, "PENDING");
    assert.equal(token.onboardingCompleted, false);
    assert.equal(token.branchId, null);
    assert.equal(token.branchCode, null);
    assert.equal(token.branchName, null);
  } finally {
    (prisma.user.findUnique as any) = originalFindUnique;
  }
});
