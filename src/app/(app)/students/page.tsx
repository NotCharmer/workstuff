import Link from "next/link";
import { Search, Users, UploadCloud } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StudentCard, type StudentCardData } from "@/components/students/student-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  class?: string;
  risk?: "low" | "high";
  avg?: "all" | "important";
};

const IMPORTANT_SUBJECT_TOKENS = [
  "פייתון",
  "python",
  "חשמל ואלקטרוניקה",
  "פיסיקה",
  "פיזיקה",
  "physics",
  "מיתוג",
  "מתמטיקה",
  "mathematics",
  "math",
] as const;

const REQUIRED_SUBJECT_FILTER: Prisma.GradeWhereInput = {
  OR: [
    { subject: { name: { contains: "פייתון" } } },
    { subject: { name: { contains: "מיתוג" } } },
    { subject: { name: { contains: "python" } } },
    { subject: { name: { contains: "Python" } } },
  ],
};

function isImportantSubject(subjectName: string): boolean {
  const normalized = subjectName.toLowerCase();
  return IMPORTANT_SUBJECT_TOKENS.some((token) => normalized.includes(token.toLowerCase()));
}

async function fetchStudents(params: SearchParams): Promise<StudentCardData[]> {
  const q = params.q?.trim();
  const className = params.class?.trim();
  const averageMode: "all" | "important" = params.avg === "all" ? "all" : "important";

  const students = await prisma.student.findMany({
    where: {
      AND: [
        {
          grades: {
            some: REQUIRED_SUBJECT_FILTER,
          },
        },
        q
          ? {
              OR: [
                { firstName: { contains: q } },
                { lastName: { contains: q } },
                { externalId: { contains: q } },
                { className: { contains: q } },
                {
                  grades: {
                    some: {
                      subject: { name: { contains: q } },
                    },
                  },
                },
              ],
            }
          : {},
        className ? { className } : {},
      ],
    },
    include: {
      grades: {
        include: { subject: { select: { name: true, isImportant: true } } },
        orderBy: { gradedAt: "desc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const mapped: StudentCardData[] = students.map((s) => {
    const latestBySubject = new Map<string, number>();
    for (const g of s.grades) {
      if (!latestBySubject.has(g.subject.name)) {
        latestBySubject.set(g.subject.name, g.value);
      }
    }
    const importantGrades = [...latestBySubject.entries()]
      .filter(([subjectName]) => isImportantSubject(subjectName))
      .map(([, value]) => value);
    const allGrades = [...latestBySubject.values()];
    const importantAvg =
      importantGrades.length === 0
        ? null
        : importantGrades.reduce((a, v) => a + v, 0) / importantGrades.length;
    const allAvg =
      allGrades.length === 0 ? null : allGrades.reduce((a, v) => a + v, 0) / allGrades.length;
    const avg = averageMode === "important" ? importantAvg : allAvg;
    const subjects = Array.from(
      new Set(
        s.grades
          .map((g) => (g.subject.isImportant ? `★ ${g.subject.name}` : g.subject.name))
          .sort((a, b) => Number(b.startsWith("★")) - Number(a.startsWith("★")))
      )
    );
    const highScoreSubjects = [...latestBySubject.entries()]
      .filter(([, value]) => value > 85)
      .map(([subjectName]) => subjectName)
      .sort((a, b) => a.localeCompare(b, "he"));
    const latest = s.grades[0]
      ? { value: s.grades[0].value, subject: s.grades[0].subject.name }
      : null;
    return {
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      externalId: s.externalId,
      className: s.className,
      avatarHue: s.avatarHue,
      gradeCount: latestBySubject.size,
      average: avg,
      averageMode,
      subjects,
      highScoreSubjects,
      latestGrade: latest,
    };
  });

  if (params.risk === "high") return mapped.filter((m) => (m.average ?? 100) < 70);
  if (params.risk === "low") return mapped.filter((m) => (m.average ?? 0) >= 90);
  return mapped;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const students = await fetchStudents(searchParams);

  const classes = await prisma.student.findMany({
    where: { className: { not: null } },
    select: { className: true },
    distinct: ["className"],
  });
  const classOptions = Array.from(
    new Set(classes.map((c) => c.className).filter(Boolean))
  ) as string[];

  const q = searchParams.q ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {he.students.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{he.students.subtitle}</p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <UploadCloud className="h-4 w-4" />
            {he.students.uploadGrades}
          </Link>
        </Button>
      </div>

      <form className="grid grid-cols-1 gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-card md:grid-cols-[1fr_200px_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={q}
            placeholder={he.students.searchPlaceholder}
            className="ps-9"
          />
        </div>

        <select
          name="class"
          defaultValue={searchParams.class ?? ""}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">{he.students.allClasses}</option>
          {classOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          name="avg"
          defaultValue={searchParams.avg ?? "important"}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="important">{he.students.avgImportant}</option>
          <option value="all">{he.students.avgAll}</option>
        </select>

        <div className="flex gap-2">
          <Button type="submit">{he.students.filter}</Button>
          {(q || searchParams.class || searchParams.risk) && (
            <Button asChild type="button" variant="ghost">
              <Link href="/students">{he.students.clear}</Link>
            </Button>
          )}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{he.students.quickFilters}</span>
        <RiskLink
          label={he.students.topPerformers}
          active={searchParams.risk === "low"}
          href={buildHref(searchParams, { risk: "low" })}
        />
        <RiskLink
          label={he.students.needsAttention}
          active={searchParams.risk === "high"}
          href={buildHref(searchParams, { risk: "high" })}
        />
        <div className="ms-auto text-xs text-muted-foreground">
          {students.length}{" "}
          {students.length === 1 ? he.students.result : he.students.results}
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={he.students.noMatch}
          description={he.students.noMatchDesc}
          action={
            <Button asChild variant="secondary">
              <Link href="/students">{he.students.clearFilters}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((s) => (
            <StudentCard key={s.id} student={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function buildHref(current: SearchParams, patch: Partial<SearchParams>) {
  const merged = { ...current, ...patch };
  if (patch.risk && current.risk === patch.risk) delete merged.risk;

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `/students?${s}` : "/students";
}

function RiskLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link href={href}>
      <Badge
        variant={active ? "default" : "outline"}
        className="cursor-pointer transition-colors hover:bg-primary/15"
      >
        {label}
      </Badge>
    </Link>
  );
}
