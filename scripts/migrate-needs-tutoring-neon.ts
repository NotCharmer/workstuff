/**
 * Add Student.needsTutoring for cadets who need a tutoring timetable.
 *
 * Usage: npm run db:migrate-needs-tutoring
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
    ALTER TABLE "Student"
    ADD COLUMN IF NOT EXISTS "needsTutoring" BOOLEAN NOT NULL DEFAULT false
  `;
  await sql`CREATE INDEX IF NOT EXISTS "Student_needsTutoring_idx" ON "Student" ("needsTutoring")`;
  console.log("Student.needsTutoring ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
