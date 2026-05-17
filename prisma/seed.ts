import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const STUDENTS = [
  ["Amelia", "Carter", "10-A", "S10421"],
  ["Noah", "Bennett", "10-A", "S10422"],
  ["Olivia", "Hughes", "10-A", "S10423"],
  ["Liam", "Patel", "10-B", "S10424"],
  ["Sophia", "Rivera", "10-B", "S10425"],
  ["Ethan", "Nakamura", "10-B", "S10426"],
  ["Isabella", "Wright", "10-B", "S10427"],
  ["Mason", "Alvarez", "11-A", "S10428"],
  ["Mia", "Kowalski", "11-A", "S10429"],
  ["Lucas", "Fischer", "11-A", "S10430"],
  ["Harper", "Singh", "11-B", "S10431"],
  ["Jackson", "Okafor", "11-B", "S10432"],
  ["Ava", "Thompson", "11-B", "S10433"],
  ["Elijah", "Martinez", "11-B", "S10434"],
];

const SUBJECTS = [
  { name: "Mathematics", color: "#6366f1" },
  { name: "English Literature", color: "#10b981" },
  { name: "Biology", color: "#14b8a6" },
  { name: "Chemistry", color: "#f59e0b" },
  { name: "History", color: "#f43f5e" },
  { name: "Physics", color: "#0ea5e9" },
  { name: "Computer Science", color: "#8b5cf6" },
];

const NOTE_TEMPLATES: {
  category: "GENERAL" | "BEHAVIOR" | "PROGRESS" | "CONCERN" | "STRENGTH";
  body: string;
}[] = [
  {
    category: "STRENGTH",
    body: "Consistently contributes thoughtful questions in class discussion. Strong written work in particular.",
  },
  {
    category: "PROGRESS",
    body: "Noticeable improvement on the last two assessments — the extra tutoring sessions are paying off.",
  },
  {
    category: "CONCERN",
    body: "Has missed two homework submissions this month. Following up with parents next week.",
  },
  {
    category: "BEHAVIOR",
    body: "Works very well in group settings, often takes a facilitator role.",
  },
  {
    category: "GENERAL",
    body: "Expressed interest in the upcoming science fair. Good candidate to mentor a younger student.",
  },
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase() || "admin@district.local";
  const adminName = process.env.DEFAULT_ADMIN_NAME?.trim() || "District Admin";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD?.trim() || "ChangeMe123!";
  const adminPasswordHash = await hash(adminPassword, 12);

  console.log("→ Resetting data");
  await prisma.note.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.uploadSession.deleteMany();
  await prisma.privateLesson.deleteMany();
  await prisma.dailyTask.deleteMany();
  await prisma.classVisit.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.student.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();

  console.log("→ Seeding default branch");
  const branch = await prisma.branch.create({
    data: {
      code: process.env.DEFAULT_BRANCH_CODE?.trim() || "rehovot",
      name: process.env.DEFAULT_BRANCH_NAME?.trim() || "רחובות",
    },
  });

  console.log("→ Seeding admin user");
  const staff = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      branchId: branch.id,
      name: adminName,
      role: "ADMIN",
      status: "ACTIVE",
      onboardingCompleted: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: adminEmail,
      name: adminName,
      role: "ADMIN",
      status: "ACTIVE",
      onboardingCompleted: true,
      passwordHash: adminPasswordHash,
      branchId: branch.id,
    },
  });

  console.log("→ Seeding subjects");
  const subjectRows = await Promise.all(
    SUBJECTS.map((s) =>
      prisma.subject.create({ data: { name: s.name, color: s.color, branchId: branch.id } })
    )
  );

  console.log("→ Seeding students");
  const studentRows = await Promise.all(
    STUDENTS.map(([firstName, lastName, className, externalId]) =>
      prisma.student.create({
        data: {
          firstName,
          lastName,
          className,
          externalId,
          branchId: branch.id,
          avatarHue: rand(0, 359),
        },
      })
    )
  );

  console.log("→ Seeding upload sessions");
  const uploads = await Promise.all(
    Array.from({ length: 4 }).map((_, i) =>
      prisma.uploadSession.create({
        data: {
          fileName: `grades-${pick(["fall", "winter", "spring"])}-week-${i + 1}.jpg`,
          status: "SAVED",
          rowCount: rand(6, 14),
          avgConfidence: 0.82 + Math.random() * 0.15,
          branchId: branch.id,
          uploaderId: staff.id,
          createdAt: new Date(Date.now() - (i + 1) * 1000 * 60 * 60 * 24),
        },
      })
    )
  );

  console.log("→ Seeding grades");
  for (const student of studentRows) {
    // Each student gets 3-6 subjects, 2-5 grades in each
    const theirSubjects = [...subjectRows].sort(() => Math.random() - 0.5).slice(0, rand(3, 6));
    const baseline = rand(55, 92); // per-student "skill" baseline

    for (const subject of theirSubjects) {
      const n = rand(2, 5);
      for (let i = 0; i < n; i++) {
        const drift = rand(-12, 14);
        const value = Math.max(0, Math.min(100, baseline + drift + i * 1.5));
        const daysAgo = (n - i) * rand(6, 12);
        await prisma.grade.create({
          data: {
            studentId: student.id,
            subjectId: subject.id,
            value: Number(value.toFixed(1)),
            source: Math.random() > 0.3 ? "OCR" : "MANUAL",
            uploadId: pick(uploads).id,
            gradedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  console.log("→ Seeding notes");
  for (const student of studentRows) {
    const n = rand(1, 3);
    for (let i = 0; i < n; i++) {
      const t = pick(NOTE_TEMPLATES);
      await prisma.note.create({
        data: {
          studentId: student.id,
          authorId: staff.id,
          category: t.category,
          body: t.body,
          createdAt: new Date(Date.now() - rand(1, 40) * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  const stats = await Promise.all([
    prisma.student.count(),
    prisma.grade.count(),
    prisma.note.count(),
  ]);
  console.log(
    `✓ Seeded ${stats[0]} students, ${stats[1]} grades, ${stats[2]} notes.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
