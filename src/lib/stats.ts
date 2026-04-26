import { prisma } from "./db";

export type DashboardStats = {
  totalStudents: number;
  totalGrades: number;
  classAverage: number;
  highestGrade: { value: number; student: string; subject: string } | null;
  lowestGrade: { value: number; student: string; subject: string } | null;
  passCount: number;
  failCount: number;
  distribution: { bucket: string; count: number }[];
  recentUploads: {
    id: string;
    fileName: string;
    createdAt: Date;
    rowCount: number;
    avgConfidence: number | null;
    status: string;
  }[];
  topStudents: { id: string; name: string; avg: number; className: string | null }[];
  attentionStudents: { id: string; name: string; avg: number; className: string | null }[];
  subjectAverages: { subject: string; avg: number; color: string }[];
};

const PASS_CUTOFF = 60;
const BUCKETS = [
  { label: "0-59", min: 0, max: 59.999 },
  { label: "60-69", min: 60, max: 69.999 },
  { label: "70-79", min: 70, max: 79.999 },
  { label: "80-89", min: 80, max: 89.999 },
  { label: "90-100", min: 90, max: 100.001 },
];

export async function getDashboardStats(): Promise<DashboardStats> {
  const [students, grades, uploads, subjects] = await Promise.all([
    prisma.student.findMany({ select: { id: true, firstName: true, lastName: true, className: true } }),
    prisma.grade.findMany({
      include: {
        student: { select: { id: true, firstName: true, lastName: true, className: true } },
        subject: { select: { name: true, color: true } },
      },
    }),
    prisma.uploadSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.subject.findMany(),
  ]);

  const totalStudents = students.length;
  const totalGrades = grades.length;
  const classAverage =
    totalGrades === 0 ? 0 : grades.reduce((s, g) => s + g.value, 0) / totalGrades;

  let highest: DashboardStats["highestGrade"] = null;
  let lowest: DashboardStats["lowestGrade"] = null;
  let pass = 0;
  let fail = 0;
  const distribution = BUCKETS.map((b) => ({ bucket: b.label, count: 0 }));

  for (const g of grades) {
    const label = `${g.student.firstName} ${g.student.lastName}`;
    if (!highest || g.value > highest.value)
      highest = { value: g.value, student: label, subject: g.subject.name };
    if (!lowest || g.value < lowest.value)
      lowest = { value: g.value, student: label, subject: g.subject.name };

    if (g.value >= PASS_CUTOFF) pass++;
    else fail++;

    const bIdx = BUCKETS.findIndex((b) => g.value >= b.min && g.value <= b.max);
    if (bIdx >= 0) distribution[bIdx].count++;
  }

  // per-student averages
  const byStudent = new Map<string, { sum: number; count: number; student: (typeof students)[0] }>();
  for (const g of grades) {
    const rec = byStudent.get(g.studentId) ?? { sum: 0, count: 0, student: g.student };
    rec.sum += g.value;
    rec.count += 1;
    byStudent.set(g.studentId, rec);
  }
  const studentAverages = [...byStudent.entries()].map(([id, rec]) => ({
    id,
    name: `${rec.student.firstName} ${rec.student.lastName}`,
    className: rec.student.className,
    avg: rec.sum / rec.count,
  }));

  const topStudents = [...studentAverages].sort((a, b) => b.avg - a.avg).slice(0, 5);
  const attentionStudents = [...studentAverages]
    .filter((s) => s.avg < 70)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 5);

  // per-subject averages
  const bySubject = new Map<string, { sum: number; count: number; color: string }>();
  for (const g of grades) {
    const rec = bySubject.get(g.subject.name) ?? { sum: 0, count: 0, color: g.subject.color };
    rec.sum += g.value;
    rec.count += 1;
    bySubject.set(g.subject.name, rec);
  }
  const subjectAverages = [...bySubject.entries()].map(([subject, rec]) => ({
    subject,
    avg: rec.sum / rec.count,
    color: rec.color,
  }));

  return {
    totalStudents,
    totalGrades,
    classAverage,
    highestGrade: highest,
    lowestGrade: lowest,
    passCount: pass,
    failCount: fail,
    distribution,
    recentUploads: uploads.map((u) => ({
      id: u.id,
      fileName: u.fileName,
      createdAt: u.createdAt,
      rowCount: u.rowCount,
      avgConfidence: u.avgConfidence,
      status: u.status,
    })),
    topStudents,
    attentionStudents,
    subjectAverages,
  };
}

export function computeStudentStats(grades: { value: number; subject: { name: string } }[]) {
  const count = grades.length;
  const avg = count ? grades.reduce((s, g) => s + g.value, 0) / count : 0;
  const max = count ? Math.max(...grades.map((g) => g.value)) : 0;
  const min = count ? Math.min(...grades.map((g) => g.value)) : 0;

  const bySubject = new Map<string, number[]>();
  for (const g of grades) {
    const list = bySubject.get(g.subject.name) ?? [];
    list.push(g.value);
    bySubject.set(g.subject.name, list);
  }
  const subjectBreakdown = [...bySubject.entries()].map(([name, values]) => ({
    subject: name,
    avg: values.reduce((s, v) => s + v, 0) / values.length,
    count: values.length,
    max: Math.max(...values),
    min: Math.min(...values),
  }));

  return { count, avg, max, min, subjectBreakdown };
}
