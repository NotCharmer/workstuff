/**
 * Add Request table for tutoring / equipment requests.
 *
 * Usage: npm run db:migrate-requests
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
    CREATE TABLE IF NOT EXISTS "Request" (
      "id" TEXT NOT NULL,
      "branchId" TEXT,
      "authorId" TEXT,
      "studentId" TEXT,
      "kind" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "details" TEXT,
      "quantity" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS "Request_branchId_idx" ON "Request" ("branchId")`;
  await sql`CREATE INDEX IF NOT EXISTS "Request_kind_idx" ON "Request" ("kind")`;
  await sql`CREATE INDEX IF NOT EXISTS "Request_status_idx" ON "Request" ("status")`;
  await sql`CREATE INDEX IF NOT EXISTS "Request_createdAt_idx" ON "Request" ("createdAt")`;
  await sql`CREATE INDEX IF NOT EXISTS "Request_studentId_idx" ON "Request" ("studentId")`;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "Request"
        ADD CONSTRAINT "Request_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE "Request"
        ADD CONSTRAINT "Request_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  await sql`
    DO $$ BEGIN
      ALTER TABLE "Request"
        ADD CONSTRAINT "Request_studentId_fkey"
        FOREIGN KEY ("studentId") REFERENCES "Student"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("Request table ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
