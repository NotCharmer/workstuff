/**
 * Add LessonMark table for personal important / tutoring-pull flags.
 *
 * Usage: npm run db:migrate-lesson-marks
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
    CREATE TABLE IF NOT EXISTS "LessonMark" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "className" TEXT NOT NULL,
      "dayOfWeek" TEXT NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "important" BOOLEAN NOT NULL DEFAULT false,
      "tutoringPull" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "LessonMark_pkey" PRIMARY KEY ("id")
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "lesson_mark_slot" ON "LessonMark" ("userId", "branchId", "className", "dayOfWeek", "startTime", "endTime", "subject")`;
  await sql`CREATE INDEX IF NOT EXISTS "LessonMark_userId_branchId_idx" ON "LessonMark" ("userId", "branchId")`;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "LessonMark"
        ADD CONSTRAINT "LessonMark_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE "LessonMark"
        ADD CONSTRAINT "LessonMark_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("LessonMark table ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
