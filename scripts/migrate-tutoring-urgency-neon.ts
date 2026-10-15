/**
 * Add tutoring urgency and a scheduled session time on Student.
 * Cadets already marked needsTutoring become "מערכת תגבורים" (STANDARD).
 *
 * Usage: npm run db:migrate-tutoring-urgency
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
    ADD COLUMN IF NOT EXISTS "tutoringUrgency" TEXT
  `;
  await sql`
    ALTER TABLE "Student"
    ADD COLUMN IF NOT EXISTS "tutoringScheduledFor" TEXT
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS "Student_tutoringUrgency_idx" ON "Student" ("tutoringUrgency")
  `;
  const updated = await sql`
    UPDATE "Student"
    SET "tutoringUrgency" = 'STANDARD'
    WHERE "needsTutoring" = true AND "tutoringUrgency" IS NULL
    RETURNING id
  `;
  console.log(`Student tutoring urgency ready (${updated.length} existing cadets set to STANDARD)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
