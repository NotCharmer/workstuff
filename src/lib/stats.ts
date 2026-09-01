import { prisma } from "./db";
import { gradeWhereForSchoolYear } from "./school-year";

export type AverageMode = "all" | "important";

/** Dashboard only: how to collapse grades before computing aggregates */
export type GradeAggregationMode = "latest" | "all";

export type DashboardStats = {
  /** Distinct non-empty class names in the DB (for filter UI), sorted */
  availableClasses: string[];
  /** Echo of validated class filter (null = all classes) */
  selectedClassFilter: string | null;
  /** Echo of grade aggregation (latest exam vs all rows) */
  selectedGradeAggregation: GradeAggregationMode;
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
  subjectAverages: {
    subject: string;
    avg: number;
    color: string;
    isImportant: boolean;
    students: {
      id: string;
      name: string;
      className: string | null;
      grade: number;
      gradeId: string;
    }[];
  }[];
};

const PASS_CUTOFF = 60;
const IMPORTANT_SUBJECT_TOKENS = [
  "פייתון",
  "python",
  "תקשוב ומערכות",
  "תקשוב",
  "מערכות",
  "חשמל ואלקטרוניקה",
  "פיסיקה",
  "פיזיקה",
  "physics",
  "מיתוג",
  "מתמטיקה",
  "mathematics",
  "math",
] as const;
const BUCKETS = [
  { label: "0-59", min: 0, max: 59.999 },
  { label: "60-69", min: 60, max: 69.999 },
  { label: "70-79", min: 70, max: 79.999 },
  { label: "80-89", min: 80, max: 89.999 },
  { label: "90-100", min: 90, max: 100.001 },
];

function isImportantSubjectName(subjectName: string): boolean {
  const normalized = subjectName.toLowerCase();
  return IMPORTANT_SUBJECT_TOKENS.some((token) => normalized.includes(token.toLowerCase()));
}

function latestByStudentSubject<
  T extends { studentId: string; subjectId: string; gradedAt: Date }
>(grades: T[]): T[] {
  const latest = new Map<string, T>();
  for (const g of grades) {
    const key = `${g.studentId}::${g.subjectId}`;
    const prev = latest.get(key);
    if (!prev || g.gradedAt.getTime() > prev.gradedAt.getTime()) {
      latest.set(key, g);
    }
  }
  return [...latest.values()];
}

export async function getDashboardStats(
  mode: AverageMode = "important",
  classFilter?: string | null,
  gradeAggregation: GradeAggregationMode = "latest",
  branchId?: string | null,
  schoolYear?: string | null,
  currentSchoolYear?: string | null
): Promise<DashboardStats> {
  const isCurrentYear =
    !schoolYear || !currentSchoolYear || schoolYear === currentSchoolYear;
  const studentScope = {
    branchId: branchId ?? null,
    ...(isCurrentYear
      ? { status: "ACTIVE" as const }
      : schoolYear
        ? { grades: { some: { schoolYear } } }
        : {}),
  };

  const [students, grades, uploads] = await Promise.all([
    prisma.student.findMany({
      where: studentScope,
      select: { id: true, firstName: true, lastName: true, className: true },
    }),
    prisma.grade.findMany({
      where: {
        student: studentScope,
        ...(schoolYear && currentSchoolYear
          ? gradeWhereForSchoolYear(schoolYear, currentSchoolYear)
          : schoolYear
            ? { OR: [{ schoolYear }, { schoolYear: null }] }
            : {}),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, className: true } },
        subject: { select: { name: true, color: true, isImportant: true } },
      },
    }),
    prisma.uploadSession.findMany({
      where: { branchId: branchId ?? null },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const availableClasses = [
    ...new Set(
      students.map((s) => s.className?.trim()).filter((c): c is string => Boolean(c))
    ),
  ].sort((a, b) => a.localeCompare(b, "he"));

  const normalizedFilter =
    classFilter?.trim() && availableClasses.includes(classFilter.trim()) ? classFilter.trim() : null;

  const studentIdsInScope = normalizedFilter
    ? new Set(students.filter((s) => s.className === normalizedFilter).map((s) => s.id))
    : null;

  const scopedRaw = studentIdsInScope
    ? grades.filter((g) => studentIdsInScope.has(g.studentId))
    : grades;

  const collapsed =
    gradeAggregation === "latest" ? latestByStudentSubject(scopedRaw) : scopedRaw;

  const effectiveGrades =
    mode === "important"
      ? collapsed.filter((g) => isImportantSubjectName(g.subject.name))
      : collapsed;

  const totalStudents = studentIdsInScope ? studentIdsInScope.size : students.length;
  const totalGrades = effectiveGrades.length;
  const classAverage =
    totalGrades === 0 ? 0 : effectiveGrades.reduce((s, g) => s + g.value, 0) / totalGrades;

  let highest: DashboardStats["highestGrade"] = null;
  let lowest: DashboardStats["lowestGrade"] = null;
  let pass = 0;
  let fail = 0;
  const distribution = BUCKETS.map((b) => ({ bucket: b.label, count: 0 }));

  for (const g of effectiveGrades) {
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
  for (const g of effectiveGrades) {
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
  const bySubject = new Map<
    string,
    {
      sum: number;
      count: number;
      color: string;
      isImportant: boolean;
      students: {
        id: string;
        name: string;
        className: string | null;
        grade: number;
        gradeId: string;
      }[];
    }
  >();
  for (const g of effectiveGrades) {
    const rec = bySubject.get(g.subject.name) ?? {
      sum: 0,
      count: 0,
      color: g.subject.color,
      isImportant: g.subject.isImportant,
      students: [],
    };
    rec.sum += g.value;
    rec.count += 1;
    rec.students.push({
      id: g.student.id,
      name: `${g.student.firstName} ${g.student.lastName}`,
      className: g.student.className,
      grade: g.value,
      gradeId: g.id,
    });
    bySubject.set(g.subject.name, rec);
  }
  const subjectAverages = [...bySubject.entries()].map(([subject, rec]) => ({
    subject,
    avg: rec.sum / rec.count,
    color: rec.color,
    isImportant: rec.isImportant,
    students: [...rec.students].sort((a, b) => b.grade - a.grade),
  }));

  return {
    availableClasses,
    selectedClassFilter: normalizedFilter,
    selectedGradeAggregation: gradeAggregation,
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

export function computeStudentStats(
  grades: { value: number; subject: { name: string }; gradedAt?: Date }[]
) {
  const latestBySubject = new Map<string, { value: number; gradedAt?: Date }>();
  for (const g of grades) {
    const prev = latestBySubject.get(g.subject.name);
    if (!prev) {
      latestBySubject.set(g.subject.name, { value: g.value, gradedAt: g.gradedAt });
      continue;
    }
    if (!g.gradedAt || !prev.gradedAt || g.gradedAt.getTime() >= prev.gradedAt.getTime()) {
      latestBySubject.set(g.subject.name, { value: g.value, gradedAt: g.gradedAt });
    }
  }
  const latestEntries = [...latestBySubject.entries()];
  const latestValues = latestEntries.map(([, v]) => v.value);
  const count = latestValues.length;
  const avg = count ? latestValues.reduce((s, v) => s + v, 0) / count : 0;
  const max = count ? Math.max(...latestValues) : 0;
  const min = count ? Math.min(...latestValues) : 0;
  const maxSubject = count
    ? (latestEntries.find(([, v]) => v.value === max)?.[0] ?? null)
    : null;
  const minSubject = count
    ? (latestEntries.find(([, v]) => v.value === min)?.[0] ?? null)
    : null;

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

  return { count, avg, max, min, maxSubject, minSubject, subjectBreakdown };
}
