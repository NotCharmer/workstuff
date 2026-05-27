/**
 * Create UserBranchAccess table in Neon (when prisma db push fails on pooler).
 *
 * Usage: npm run db:migrate-user-branches
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
    CREATE TABLE IF NOT EXISTS "UserBranchAccess" (
      "userId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserBranchAccess_pkey" PRIMARY KEY ("userId", "branchId")
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS "UserBranchAccess_branchId_idx"
    ON "UserBranchAccess" ("branchId")
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "UserBranchAccess"
        ADD CONSTRAINT "UserBranchAccess_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  await sql`
    DO $$ BEGIN
      ALTER TABLE "UserBranchAccess"
        ADD CONSTRAINT "UserBranchAccess_branchId_fkey"
        FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;

  console.log("UserBranchAccess table ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
