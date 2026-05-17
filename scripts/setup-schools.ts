import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { SCHOOLS } from "../src/lib/schools";

const sql = neon(process.env.DATABASE_URL!);

function newBranchId() {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

async function upsertSchool(code: string, name: string): Promise<string> {
  const rows = await sql`SELECT id FROM "Branch" WHERE code = ${code} LIMIT 1`;
  if (rows.length > 0) {
    const id = rows[0].id as string;
    await sql`UPDATE "Branch" SET name = ${name}, "updatedAt" = NOW() WHERE id = ${id}`;
    return id;
  }
  const id = newBranchId();
  await sql`
    INSERT INTO "Branch" (id, code, name, "createdAt", "updatedAt")
    VALUES (${id}, ${code}, ${name}, NOW(), NOW())
  `;
  return id;
}

async function main() {
  const rehovotId = await upsertSchool("rehovot", "רחובות");
  const telAvivId = await upsertSchool("tel-aviv", "תל אביב");
  const herzliyaId = await upsertSchool("herzliya", "הרצליה");

  const legacy =
    await sql`SELECT id, code FROM "Branch" WHERE code NOT IN ('rehovot', 'tel-aviv', 'herzliya')`;

  for (const row of legacy) {
    const legacyId = row.id as string;
    await sql`UPDATE "Student" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`UPDATE "Subject" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`UPDATE "UploadSession" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`UPDATE "DailyTask" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`UPDATE "ClassVisit" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`UPDATE "TimetableEntry" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`UPDATE "User" SET "branchId" = ${rehovotId} WHERE "branchId" = ${legacyId}`;
    await sql`DELETE FROM "Branch" WHERE id = ${legacyId}`;
  }

  await sql`UPDATE "Student" SET "branchId" = ${rehovotId} WHERE "branchId" IS NULL`;
  await sql`UPDATE "Subject" SET "branchId" = ${rehovotId} WHERE "branchId" IS NULL`;
  await sql`UPDATE "UploadSession" SET "branchId" = ${rehovotId} WHERE "branchId" IS NULL`;
  await sql`UPDATE "DailyTask" SET "branchId" = ${rehovotId} WHERE "branchId" IS NULL`;
  await sql`UPDATE "ClassVisit" SET "branchId" = ${rehovotId} WHERE "branchId" IS NULL`;
  await sql`UPDATE "TimetableEntry" SET "branchId" = ${rehovotId} WHERE "branchId" IS NULL`;
  await sql`
    UPDATE "User" SET "branchId" = ${rehovotId}
    WHERE email = 'mercazhadash@gmail.com' OR "branchId" IS NULL
  `;

  const counts = await sql`
    SELECT b.code, b.name, COUNT(s.id)::int AS students
    FROM "Branch" b
    LEFT JOIN "Student" s ON s."branchId" = b.id
    WHERE b.code IN ('rehovot', 'tel-aviv', 'herzliya')
    GROUP BY b.id, b.code, b.name
    ORDER BY b.name
  `;

  console.log(
    JSON.stringify({ rehovotId, telAvivId, herzliyaId, counts }, null, 2)
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
