/**
 * Add PersonalSlot table for custom items in free hours on the personal timetable.
 *
 * Usage: npm run db:migrate-personal-slots
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
    CREATE TABLE IF NOT EXISTS "PersonalSlot" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "dayOfWeek" TEXT NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PersonalSlot_pkey" PRIMARY KEY ("id")
    )
  `;

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS "personal_slot" ON "PersonalSlot" ("userId", "branchId", "dayOfWeek", "startTime", "endTime")`;
  await sql`CREATE INDEX IF NOT EXISTS "PersonalSlot_userId_branchId_idx" ON "PersonalSlot" ("userId", "branchId")`;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "PersonalSlot"
        ADD CONSTRAINT "PersonalSlot_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE "PersonalSlot"
        ADD CONSTRAINT "PersonalSlot_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("PersonalSlot table ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
