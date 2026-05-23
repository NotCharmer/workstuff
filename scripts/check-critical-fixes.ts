import assert from "node:assert/strict";
import { parseGradeCsv } from "../src/lib/csv/parse-grade-csv";
import { getAuthSecret } from "../src/lib/auth-secret";
import { isTargetSubject as isServerTargetSubject } from "../src/lib/upload/target-subjects";
import { isTargetSubject as isClientTargetSubject } from "../src/lib/upload/target-subjects-client";

assert.equal(isServerTargetSubject("מערכות מידע"), false);
assert.equal(isClientTargetSubject("מערכות מידע"), false);
assert.equal(isServerTargetSubject("תקשוב ומערכות"), true);
assert.equal(isClientTargetSubject("מערכות אלקטרוניקה"), true);

const parsed = parseGradeCsv(
  Buffer.from(
    [
      "id,studentName,subject,grade",
      "1,דנה כהן,פייתון,90",
      "2,דנה כהן,חשמל,85",
      "3,יוסי לוי,פייתון,88",
    ].join("\n"),
    "utf8"
  ),
  "long-format.csv"
);

assert.equal(parsed.ok, true);
if (parsed.ok) {
  assert.deepEqual(
    parsed.result.rows.map((row) => row.externalId),
    [null, null, null]
  );
}

const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;
const originalAuthSecret = process.env.AUTH_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
delete process.env.NEXTAUTH_SECRET;
delete process.env.AUTH_SECRET;
Reflect.set(process.env, "NODE_ENV", "production");
assert.throws(() => getAuthSecret(), /NEXTAUTH_SECRET/);
if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else Reflect.set(process.env, "NODE_ENV", originalNodeEnv);
if (originalNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
else process.env.NEXTAUTH_SECRET = originalNextAuthSecret;
if (originalAuthSecret === undefined) delete process.env.AUTH_SECRET;
else process.env.AUTH_SECRET = originalAuthSecret;

console.log("critical correctness checks passed");
