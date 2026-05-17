import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  const [beforeRow] = await sql`SELECT COUNT(*)::int AS count FROM "Student"`;
  const [gradesBeforeRow] = await sql`SELECT COUNT(*)::int AS count FROM "Grade"`;

  await sql`DELETE FROM "Student"`;

  const [afterRow] = await sql`SELECT COUNT(*)::int AS count FROM "Student"`;
  const [gradesAfterRow] = await sql`SELECT COUNT(*)::int AS count FROM "Grade"`;

  console.log(
    JSON.stringify(
      {
        deletedStudents: beforeRow.count,
        gradesRemoved: gradesBeforeRow.count - gradesAfterRow.count,
        studentsRemaining: afterRow.count,
        gradesRemaining: gradesAfterRow.count,
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
