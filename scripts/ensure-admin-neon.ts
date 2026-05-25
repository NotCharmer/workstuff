/**
 * Ensure the default ADMIN user exists in Neon (HTTPS driver — works when Prisma P1001 on port 5432).
 *
 * Env:
 *   DATABASE_URL
 *   DEFAULT_ADMIN_EMAIL (default: mercazhadash@gmail.com)
 *   DEFAULT_ADMIN_PASSWORD (default: ChangeMe123!)
 *   DEFAULT_ADMIN_NAME
 *   DEFAULT_BRANCH_CODE (default: rehovot)
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { hash } from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

const adminEmail =
  process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() || "mercazhadash@gmail.com";
const adminName = process.env.DEFAULT_ADMIN_NAME?.trim() || "מנהל מערכת";
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD?.trim() || "ChangeMe123!";
const branchCode = process.env.DEFAULT_BRANCH_CODE?.trim() || "rehovot";
const staffDefaultPassword =
  process.env.DEFAULT_STAFF_PASSWORD?.trim() || "Staff123!";

function newId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

async function main() {
  const passwordHash = await hash(adminPassword, 12);

  let branchRows = await sql`
    SELECT id, code, name FROM "Branch" WHERE code = ${branchCode} LIMIT 1
  `;

  let branchId: string;
  if (branchRows.length === 0) {
    branchId = newId();
    const branchName = process.env.DEFAULT_BRANCH_NAME?.trim() || "רחובות";
    await sql`
      INSERT INTO "Branch" (id, code, name, "createdAt", "updatedAt")
      VALUES (${branchId}, ${branchCode}, ${branchName}, NOW(), NOW())
    `;
    console.log(`Created branch ${branchCode}`);
  } else {
    branchId = branchRows[0].id as string;
  }

  const existing = await sql`
    SELECT id, email, role, status FROM "User" WHERE email = ${adminEmail} LIMIT 1
  `;

  if (existing.length === 0) {
    const userId = newId();
    await sql`
      INSERT INTO "User" (
        id, email, name, "passwordHash", "branchId", role, status,
        "onboardingCompleted", "createdAt"
      ) VALUES (
        ${userId}, ${adminEmail}, ${adminName}, ${passwordHash}, ${branchId},
        'ADMIN', 'ACTIVE', true, NOW()
      )
    `;
    console.log(`Created admin user: ${adminEmail}`);
  } else {
    const userId = existing[0].id as string;
    await sql`
      UPDATE "User" SET
        name = ${adminName},
        "passwordHash" = ${passwordHash},
        "branchId" = ${branchId},
        role = 'ADMIN',
        status = 'ACTIVE',
        "onboardingCompleted" = true
      WHERE id = ${userId}
    `;
    console.log(`Updated admin user: ${adminEmail}`);
  }

  const users = await sql`
    SELECT email, role, status, "branchId" FROM "User" ORDER BY "createdAt" DESC LIMIT 5
  `;

  console.log(
    JSON.stringify(
      {
        adminEmail,
        branchCode,
        defaultStaffPassword: staffDefaultPassword,
        note: "Set DEFAULT_STAFF_PASSWORD on Vercel for production staff first-login.",
        recentUsers: users,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
