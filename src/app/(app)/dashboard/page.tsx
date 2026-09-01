import Link from "next/link";
import {
  Users,
  TrendingUp,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UploadCloud,
  StickyNote,
  ArrowRight,
  Sparkles,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { SubjectAverages } from "@/components/dashboard/subject-averages";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { getDashboardStats, type AverageMode, type GradeAggregationMode } from "@/lib/stats";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import {
  getCurrentSchoolYear,
  listSchoolYears,
  resolveSelectedSchoolYear,
} from "@/lib/school-year";
import { formatGrade, initials, percent } from "@/lib/utils";
import { he } from "@/lib/i18n/he";
import { dateLocaleHe, uploadStatusHe } from "@/lib/i18n";
import { SchoolYearSelect } from "@/components/students/school-year-select";

export const dynamic = "force-dynamic";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function pickSearchParam(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function studentYearHref(id: string, year: string | null) {
  return year ? `/students/${id}?year=${encodeURIComponent(year)}` : `/students/${id}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);
  const currentSchoolYear = await getCurrentSchoolYear();
  const availableYears = await listSchoolYears(branchId);
  const selectedYear = resolveSelectedSchoolYear(
    pickSearchParam(searchParams.year),
    availableYears,
    currentSchoolYear
  );
  const isCurrentYear = selectedYear === currentSchoolYear;
  const averageMode: AverageMode =
    pickSearchParam(searchParams.avg) === "all" ? "all" : "important";
  const classRaw = pickSearchParam(searchParams.class)?.trim() || null;
  const basisRaw = pickSearchParam(searchParams.basis)?.trim().toLowerCase();
  const gradeAggregation: GradeAggregationMode = basisRaw === "all" ? "all" : "latest";

  let s;
  try {
    s = await getDashboardStats(
      averageMode,
      classRaw,
      gradeAggregation,
      branchId,
      selectedYear,
      currentSchoolYear
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[dashboard] getDashboardStats failed:", e);
    throw new Error(
      msg.includes("Can't reach database") || msg.includes("P1001")
        ? "Can't reach database server"
        : `Dashboard load failed: ${msg}`
    );
  }

  const archiveYear = isCurrentYear ? null : selectedYear;
  const passRate = percent(s.passCount, s.passCount + s.failCount);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">
            {he.dashboard.welcome(firstName(user.name))}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {he.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCurrentYear
              ? s.selectedClassFilter
                ? he.dashboard.subtitleClassOnly(s.selectedClassFilter)
                : he.dashboard.subtitle
              : he.schoolYear.viewingPast(selectedYear)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SchoolYearSelect
            currentSchoolYear={currentSchoolYear}
            years={availableYears}
            selectedYear={selectedYear}
          />
          <form className="flex flex-wrap items-center gap-2" action="/dashboard" method="get">
            {selectedYear !== currentSchoolYear && (
              <input type="hidden" name="year" value={selectedYear} />
            )}
            <label className="sr-only" htmlFor="dash-class">
              {he.students.allClasses}
            </label>
            <select
              id="dash-class"
              name="class"
              defaultValue={s.selectedClassFilter ?? ""}
              className="h-10 min-w-[10rem] rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{he.students.allClasses}</option>
              {s.availableClasses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              name="avg"
              defaultValue={averageMode}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="important">{he.dashboard.avgImportant}</option>
              <option value="all">{he.dashboard.avgAll}</option>
            </select>
            <label className="sr-only" htmlFor="dash-basis">
              {he.dashboard.gradeBasisFilterLabel}
            </label>
            <select
              id="dash-basis"
              name="basis"
              defaultValue={gradeAggregation}
              className="h-10 min-w-[11rem] rounded-lg border border-input bg-background px-3 text-sm shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="latest">{he.dashboard.gradeBasisLatest}</option>
              <option value="all">{he.dashboard.gradeBasisAll}</option>
            </select>
            <Button type="submit" variant="secondary">
              {he.students.filter}
            </Button>
          </form>
          <Button asChild>
            <Link href="/upload">
              <UploadCloud className="h-4 w-4" />
              {he.dashboard.uploadGrades}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/students">
              <Users className="h-4 w-4" />
              {he.dashboard.viewStudents}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={he.dashboard.totalStudents}
          value={s.totalStudents}
          hint={he.dashboard.gradesTracked(s.totalGrades)}
          icon={Users}
        />
        <MetricCard
          label={he.dashboard.classAverage}
          value={s.totalGrades ? formatGrade(s.classAverage) : "—"}
          hint={
            s.totalGrades
              ? [
                  averageMode === "important"
                    ? he.dashboard.acrossImportant
                    : he.dashboard.acrossGrades,
                  s.selectedGradeAggregation === "latest"
                    ? he.dashboard.gradeBasisShortLatest
                    : he.dashboard.gradeBasisShortAll,
                ].join(" · ")
              : he.dashboard.uploadToBegin
          }
          icon={TrendingUp}
          tone="info"
        />
        <MetricCard
          label={he.dashboard.highest}
          value={s.highestGrade ? formatGrade(s.highestGrade.value) : "—"}
          hint={
            s.highestGrade
              ? `${s.highestGrade.student} · ${s.highestGrade.subject}`
              : he.dashboard.noDataYet
          }
          icon={Trophy}
          tone="success"
        />
        <MetricCard
          label={he.dashboard.lowest}
          value={s.lowestGrade ? formatGrade(s.lowestGrade.value) : "—"}
          hint={
            s.lowestGrade
              ? `${s.lowestGrade.student} · ${s.lowestGrade.subject}`
              : he.dashboard.noDataYet
          }
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{he.dashboard.gradeDistribution}</CardTitle>
                <CardDescription>
                  {s.selectedGradeAggregation === "latest"
                    ? he.dashboard.distributionDescLatest
                    : he.dashboard.distributionDescAll}
                </CardDescription>
              </div>
              <Badge variant="info" className="gap-1">
                <Activity className="h-3 w-3" />
                {he.common.live}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {s.totalGrades ? (
              <DistributionChart data={s.distribution} />
            ) : (
              <EmptyState
                icon={Activity}
                title={he.dashboard.noGradesInChart}
                description={he.dashboard.noGradesInChartDesc}
                action={
                  <Button asChild size="sm">
                    <Link href="/upload">{he.dashboard.uploadFirst}</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.dashboard.passFail}</CardTitle>
            <CardDescription>{he.dashboard.passUsing60}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold">{passRate}%</span>
              <span className="text-sm text-muted-foreground">{he.dashboard.passRate}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-700"
                style={{ width: `${passRate}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{he.dashboard.passing}</span>
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">{s.passCount}</div>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">{he.dashboard.failing}</span>
                </div>
                <div className="mt-1 font-display text-2xl font-semibold">{s.failCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
            <CardHeader>
              <CardTitle>{he.dashboard.subjectAverages}</CardTitle>
              <CardDescription>
                {s.selectedGradeAggregation === "latest"
                  ? he.dashboard.subjectAveragesDescLatest
                  : he.dashboard.subjectAveragesDescAll}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubjectAverages
                items={s.subjectAverages}
                gradeAggregation={s.selectedGradeAggregation}
                year={archiveYear ?? undefined}
              />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <CardTitle>{he.dashboard.topPerformers}</CardTitle>
            </div>
            <CardDescription>{he.dashboard.topPerformersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.topStudents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {s.totalStudents === 0
                  ? availableYears.length > 1
                    ? he.dashboard.noStudentsThisYear
                    : he.dashboard.noStudentsYet
                  : he.dashboard.noGradesThisYear}
              </p>
            )}
            {s.topStudents.map((stu, i) => (
              <Link
                key={stu.id}
                href={studentYearHref(stu.id, archiveYear)}
                className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    className="text-xs"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 40) % 360} 80% 60%), hsl(${(i * 40 + 60) % 360} 75% 50%))`,
                    }}
                  >
                    {initials(stu.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{stu.name}</p>
                  <p className="text-xs text-muted-foreground">{stu.className ?? "—"}</p>
                </div>
                <Badge variant="success">{formatGrade(stu.avg)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <CardTitle>{he.dashboard.needsAttention}</CardTitle>
            </div>
            <CardDescription>{he.dashboard.needsAttentionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.attentionStudents.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {s.totalGrades === 0
                  ? he.dashboard.noGradesThisYear
                  : he.dashboard.nobodyBelow}
              </p>
            )}
            {s.attentionStudents.map((stu) => (
              <Link
                key={stu.id}
                href={studentYearHref(stu.id, archiveYear)}
                className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-rose-500/15 text-xs text-rose-600 dark:text-rose-400">
                    {initials(stu.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{stu.name}</p>
                  <p className="text-xs text-muted-foreground">{stu.className ?? "—"}</p>
                </div>
                <Badge variant="danger">{formatGrade(stu.avg)}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{he.dashboard.recentUploads}</CardTitle>
              <CardDescription>{he.dashboard.recentUploadsDesc}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/upload" className="gap-1">
                {he.dashboard.uploadNew}
                <ArrowRight className="h-4 w-4 [dir=rtl]:-scale-x-100" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {s.recentUploads.length === 0 ? (
              <EmptyState
                icon={UploadCloud}
                title={he.dashboard.noUploadsYet}
                description={he.dashboard.noUploadsDesc}
                action={
                  <Button asChild size="sm">
                    <Link href="/upload">{he.dashboard.uploadGrades}</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border/60">
                {s.recentUploads.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(u.createdAt, {
                            addSuffix: true,
                            locale: dateLocaleHe,
                          })}{" "}
                          · {u.rowCount} {he.common.rows}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.avgConfidence != null && (
                        <Badge
                          variant={
                            u.avgConfidence >= 0.9
                              ? "success"
                              : u.avgConfidence >= 0.8
                                ? "info"
                                : "warning"
                          }
                        >
                          {Math.round(u.avgConfidence * 100)}%
                        </Badge>
                      )}
                      <Badge variant="outline">{uploadStatusHe(u.status)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.dashboard.quickActions}</CardTitle>
            <CardDescription>{he.dashboard.quickActionsDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickAction
              href="/upload"
              icon={UploadCloud}
              title={he.dashboard.qaUploadTitle}
              hint={he.dashboard.qaUploadHint}
            />
            <QuickAction
              href="/students"
              icon={Users}
              title={he.dashboard.qaBrowseTitle}
              hint={he.dashboard.qaBrowseHint}
            />
            <QuickAction
              href="/analytics"
              icon={Sparkles}
              title={he.dashboard.qaAnalyticsTitle}
              hint={he.dashboard.qaAnalyticsHint}
            />
            <QuickAction
              href="/students"
              icon={StickyNote}
              title={he.dashboard.qaNoteTitle}
              hint={he.dashboard.qaNoteHint}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  hint,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 [dir=rtl]:-scale-x-100 group-hover:[dir=rtl]:-translate-x-0.5" />
    </Link>
  );
}
