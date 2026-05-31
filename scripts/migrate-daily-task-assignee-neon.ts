/**
 * Add assigneeId to DailyTask (null = general branch task).
 *
 * Usage: npm run db:migrate-daily-task-assignee
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
    ALTER TABLE "DailyTask" ADD COLUMN IF NOT EXISTS "assigneeId" TEXT
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "DailyTask_assigneeId_idx"
    ON "DailyTask" ("assigneeId")
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "DailyTask_branchId_date_idx"
    ON "DailyTask" ("branchId", "date")
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "DailyTask"
        ADD CONSTRAINT "DailyTask_assigneeId_fkey"
        FOREIGN KEY ("assigneeId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("DailyTask.assigneeId ready (existing rows remain general tasks)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
