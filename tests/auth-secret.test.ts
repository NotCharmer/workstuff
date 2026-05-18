import assert from "node:assert/strict";
import test from "node:test";
import { getAuthSecret } from "../src/lib/auth-secret";

test("getAuthSecret prefers configured secrets", () => {
  assert.equal(
    getAuthSecret({
      NODE_ENV: "production",
      NEXTAUTH_SECRET: "nextauth-secret",
      AUTH_SECRET: "auth-secret",
    }),
    "nextauth-secret"
  );
  assert.equal(
    getAuthSecret({
      NODE_ENV: "production",
      AUTH_SECRET: "auth-secret",
    }),
    "auth-secret"
  );
});

test("getAuthSecret has no predictable production fallback", () => {
  assert.equal(getAuthSecret({ NODE_ENV: "production" }), undefined);
});

test("getAuthSecret keeps the development fallback", () => {
  assert.equal(getAuthSecret({ NODE_ENV: "development" }), "dev-only-secret-change-me");
});
