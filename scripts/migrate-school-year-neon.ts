/**
 * Add school-year fields: Grade.schoolYear, Student.status, AppConfig.
 *
 * Usage: npm run db:migrate-school-year
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

function inferSchoolYear(d = new Date()): string {
  const y = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  if (month >= 7) {
    return `${y}-${y + 1}`;
  }
  return `${y - 1}-${y}`;
}

async function main() {
  const year = inferSchoolYear();

  await sql`
    ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE'
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "Student_status_idx" ON "Student" (status)
  `;

  await sql`
    ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "schoolYear" TEXT
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "Grade_schoolYear_idx" ON "Grade" ("schoolYear")
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "AppConfig" (
      id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
      "currentSchoolYear" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const existing = await sql`SELECT id FROM "AppConfig" WHERE id = 'default' LIMIT 1`;
  if (existing.length === 0) {
    await sql`
      INSERT INTO "AppConfig" (id, "currentSchoolYear", "updatedAt")
      VALUES ('default', ${year}, NOW())
    `;
    console.log(`Created AppConfig with currentSchoolYear=${year}`);
  } else {
    console.log("AppConfig already exists");
  }

  const configRows = await sql`
    SELECT "currentSchoolYear" FROM "AppConfig" WHERE id = 'default' LIMIT 1
  `;
  const currentYear = (configRows[0]?.currentSchoolYear as string) || year;

  const tagged = await sql`
    UPDATE "Grade"
    SET "schoolYear" = ${currentYear}
    WHERE "schoolYear" IS NULL
  `;
  console.log(`Tagged existing grades with schoolYear=${currentYear}`, tagged);

  console.log("School-year migration ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
