/**
 * Count completed tutoring sessions on a request without closing it.
 *
 * Usage: npm run db:migrate-tutoring-done-count
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  await sql`
    ALTER TABLE "Request"
    ADD COLUMN IF NOT EXISTS "tutoringDoneCount" INTEGER NOT NULL DEFAULT 0
  `;
  console.log("Request.tutoringDoneCount ready");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
