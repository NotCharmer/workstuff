/**
 * Reset a user's password in Neon (HTTPS).
 * Usage: npx tsx scripts/reset-user-password-neon.ts user@email.com NewPassword123!
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { hash } from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const email = process.argv[2]?.trim().toLowerCase();
const password = process.argv[3]?.trim();

if (!email || !password || password.length < 8) {
  console.error("Usage: npx tsx scripts/reset-user-password-neon.ts <email> <password-min-8-chars>");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  const rows = await sql`SELECT id, email, role, status FROM "User" WHERE email = ${email} LIMIT 1`;
  if (rows.length === 0) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);
  await sql`UPDATE "User" SET "passwordHash" = ${passwordHash} WHERE email = ${email}`;

  console.log(JSON.stringify({ ok: true, email, role: rows[0].role, status: rows[0].status }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
