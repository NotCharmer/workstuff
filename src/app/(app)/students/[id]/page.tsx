import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Hash,
  Users,
  Calendar,
  Trophy,
  AlertTriangle,
} from "lucide-react";

import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/ui/empty-state";
import { GradeTrend } from "@/components/students/grade-trend";
import { NotesPanel } from "@/components/students/notes-panel";
import { GradeManager } from "@/components/students/grade-manager";
import { StudentGenderSelect } from "@/components/students/student-gender-select";
import { SubjectBreakdownList } from "@/components/students/subject-breakdown-list";
import { MetricCard } from "@/components/dashboard/metric-card";
import { avatarGradient, formatGrade, initials } from "@/lib/utils";
import { computeStudentStats } from "@/lib/stats";
import { he } from "@/lib/i18n/he";
import { dateLocaleHe } from "@/lib/i18n";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);
  const student = await prisma.student.findFirst({
    where: { id: params.id, branchId: branchId },
    include: {
      grades: {
        include: { subject: true },
        orderBy: { gradedAt: "desc" },
      },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) notFound();

  const stats = computeStudentStats(
    student.grades.map((g) => ({
      value: g.value,
      subject: { name: g.subject.name },
      gradedAt: g.gradedAt,
    }))
  );

  const trendData = student.grades.map((g) => ({
    date: g.gradedAt.toISOString(),
    value: g.value,
    subject: g.subject.name,
  }));

  let trend: "up" | "down" | "flat" = "flat";
  if (student.grades.length >= 4) {
    const half = Math.floor(student.grades.length / 2);
    const firstAvg =
      [...student.grades].reverse().slice(0, half).reduce((s, g) => s + g.value, 0) / half;
    const secondAvg =
      [...student.grades].reverse().slice(half).reduce((s, g) => s + g.value, 0) /
      (student.grades.length - half);
    if (secondAvg - firstAvg > 2) trend = "up";
    else if (firstAvg - secondAvg > 2) trend = "down";
  }

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendTone =
    trend === "up" ? "success" : trend === "down" ? "danger" : "secondary";
  const trendLabel =
    trend === "up"
      ? he.studentDetail.trend.up
      : trend === "down"
        ? he.studentDetail.trend.down
        : he.studentDetail.trend.flat;

  const name = `${student.firstName} ${student.lastName}`;
  const enrolledStr = format(student.createdAt, "PP", { locale: dateLocaleHe });
  const uniqueSubjects = new Map<string, { id: string; name: string; isImportant: boolean }>();
  for (const g of student.grades) {
    if (!uniqueSubjects.has(g.subject.id)) {
      uniqueSubjects.set(g.subject.id, {
        id: g.subject.id,
        name: g.subject.name,
        isImportant: g.subject.isImportant,
      });
    }
  }

  const subjectMeta = new Map<string, { color: string; isImportant: boolean }>();
  const subjectGrades = new Map<
    string,
    { id: string; value: number; gradedAt: string; source: string }[]
  >();
  for (const g of student.grades) {
    if (!subjectMeta.has(g.subject.name)) {
      subjectMeta.set(g.subject.name, {
        color: g.subject.color,
        isImportant: g.subject.isImportant,
      });
    }
    const list = subjectGrades.get(g.subject.name) ?? [];
    list.push({
      id: g.id,
      value: g.value,
      gradedAt: g.gradedAt.toISOString(),
      source: g.source,
    });
    subjectGrades.set(g.subject.name, list);
  }
  const subjectBreakdownItems = stats.subjectBreakdown.map((s) => ({
    ...s,
    color: subjectMeta.get(s.subject)?.color ?? null,
    isImportant: subjectMeta.get(s.subject)?.isImportant ?? false,
    grades: subjectGrades.get(s.subject) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/students" className="gap-1">
            <ArrowLeft className="h-4 w-4 [dir=rtl]:-scale-x-100" />
            {he.studentDetail.back}
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-indigo-500/20 via-violet-500/10 to-fuchsia-500/20" />
        <CardContent className="-mt-12 flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 ring-4 ring-card">
              <AvatarFallback
                className="text-xl font-semibold"
                style={{ background: avatarGradient(student.avatarHue) }}
              >
                {initials(student.firstName, student.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">{name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {student.externalId && (
                  <span className="inline-flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    {student.externalId}
                  </span>
                )}
                {student.className && (
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {student.className}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {he.studentDetail.subjectsCount(stats.subjectBreakdown.length)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {he.studentDetail.enrolled(enrolledStr)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={trendTone as any} className="gap-1.5">
              <TrendIcon className="h-3.5 w-3.5" />
              {trendLabel}
            </Badge>
            {stats.avg >= 90 && (
              <Badge variant="success" className="gap-1.5">
                <Trophy className="h-3.5 w-3.5" />
                {he.studentDetail.topPerformer}
              </Badge>
            )}
            {stats.count > 0 && stats.avg < 65 && (
              <Badge variant="danger" className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {he.studentDetail.needsAttention}
              </Badge>
            )}
            <StudentGenderSelect
              studentId={student.id}
              initialGender={student.gender === "FEMALE" ? "FEMALE" : "MALE"}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={he.studentDetail.average}
          value={stats.count ? formatGrade(stats.avg) : "—"}
          hint={he.studentDetail.acrossAll}
          icon={TrendingUp}
          tone="info"
        />
        <MetricCard
          label={he.studentDetail.highest}
          value={stats.count ? formatGrade(stats.max) : "—"}
          hint={
            stats.count && stats.maxSubject
              ? he.studentDetail.bestSingleSubject(stats.maxSubject)
              : he.studentDetail.bestSingle
          }
          icon={Trophy}
          tone="success"
        />
        <MetricCard
          label={he.studentDetail.lowest}
          value={stats.count ? formatGrade(stats.min) : "—"}
          hint={
            stats.count && stats.minSubject
              ? he.studentDetail.worstSingleSubject(stats.minSubject)
              : he.studentDetail.worstSingle
          }
          icon={AlertTriangle}
          tone="warning"
        />
        <MetricCard
          label={he.studentDetail.gradesRecorded}
          value={stats.count}
          hint={he.studentDetail.subjectsCount(stats.subjectBreakdown.length)}
          icon={BookOpen}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{he.studentDetail.tabOverview}</TabsTrigger>
          <TabsTrigger value="grades">{he.studentDetail.tabGrades(stats.count)}</TabsTrigger>
          <TabsTrigger value="notes">
            {he.studentDetail.tabNotes(student.notes.length)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{he.studentDetail.gradeTrend}</CardTitle>
                <CardDescription>{he.studentDetail.gradeTrendDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length ? (
                  <GradeTrend data={trendData} />
                ) : (
                  <EmptyState
                    icon={TrendingUp}
                    title={he.studentDetail.noGrades}
                    description={he.studentDetail.noGradesDesc}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{he.studentDetail.subjectBreakdown}</CardTitle>
                <CardDescription>{he.studentDetail.subjectBreakdownDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <SubjectBreakdownList items={subjectBreakdownItems} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>{he.studentDetail.gradeHistory}</CardTitle>
              <CardDescription>{he.studentDetail.gradeHistoryDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <GradeManager
                studentId={student.id}
                initialSubjects={[...uniqueSubjects.values()]}
                initialGrades={student.grades.map((g) => ({
                  id: g.id,
                  value: g.value,
                  source: g.source,
                  gradedAt: g.gradedAt.toISOString(),
                  subject: {
                    id: g.subject.id,
                    name: g.subject.name,
                    color: g.subject.color,
                    isImportant: g.subject.isImportant,
                  },
                }))}
              />
              {student.grades.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={BookOpen}
                    title={he.studentDetail.noGradesInTable}
                    description={he.studentDetail.noGradesInTableDesc}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>{he.studentDetail.notesTitle}</CardTitle>
              <CardDescription>{he.studentDetail.notesDesc}</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5">
              <NotesPanel
                studentId={student.id}
                initialNotes={student.notes.map((n) => ({
                  id: n.id,
                  body: n.body,
                  category: n.category as
                    | "GENERAL"
                    | "BEHAVIOR"
                    | "PROGRESS"
                    | "CONCERN"
                    | "STRENGTH",
                  createdAt: n.createdAt.toISOString(),
                  updatedAt: n.updatedAt.toISOString(),
                  author: n.author,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
