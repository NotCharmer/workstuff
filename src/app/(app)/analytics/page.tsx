import Link from "next/link";
import { TrendingUp, Users, BarChart3, Activity } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubjectAverages } from "@/components/dashboard/subject-averages";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MetricCard } from "@/components/dashboard/metric-card";

import { getDashboardStats } from "@/lib/stats";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { getCurrentSchoolYear } from "@/lib/school-year";
import { formatGrade, initials, percent } from "@/lib/utils";
import { he } from "@/lib/i18n/he";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);
  const schoolYear = await getCurrentSchoolYear();
  const s = await getDashboardStats("important", null, "latest", branchId, schoolYear);
  const passRate = percent(s.passCount, s.passCount + s.failCount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {he.analytics.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.analytics.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={he.analytics.passRate}
          value={`${passRate}%`}
          hint={he.analytics.passFailing(s.passCount, s.failCount)}
          icon={TrendingUp}
          tone="success"
        />
        <MetricCard
          label={he.analytics.tracked}
          value={s.totalStudents}
          hint={`${s.totalGrades} ${he.studentCard.grades}`}
          icon={Users}
          tone="info"
        />
        <MetricCard
          label={he.analytics.subjects}
          value={s.subjectAverages.length}
          hint={he.analytics.withGrades}
          icon={BarChart3}
        />
        <MetricCard
          label={he.analytics.classAverage}
          value={s.totalGrades ? formatGrade(s.classAverage) : "—"}
          hint={he.analytics.weighted}
          icon={Activity}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{he.analytics.distributionTitle}</CardTitle>
            <CardDescription>{he.analytics.distributionDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <DistributionChart data={s.distribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{he.analytics.subjectAverages}</CardTitle>
            <CardDescription>{he.analytics.subjectHover}</CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectAverages items={s.subjectAverages} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{he.dashboard.topPerformers}</CardTitle>
            <CardDescription>{he.analytics.topDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.topStudents.length === 0 && (
              <p className="text-sm text-muted-foreground">{he.analytics.noData}</p>
            )}
            {s.topStudents.map((stu, i) => (
              <Link
                key={stu.id}
                href={`/students/${stu.id}`}
                className="-mx-2 flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
              >
                <span className="w-5 text-center text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    className="text-xs"
                    style={{
                      background: `linear-gradient(135deg, hsl(${(i * 45) % 360} 75% 60%), hsl(${(i * 45 + 80) % 360} 70% 50%))`,
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
            <CardTitle>{he.dashboard.needsAttention}</CardTitle>
            <CardDescription>{he.analytics.attentionDesc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.attentionStudents.length === 0 && (
              <p className="text-sm text-muted-foreground">{he.analytics.everyoneAbove}</p>
            )}
            {s.attentionStudents.map((stu) => (
              <Link
                key={stu.id}
                href={`/students/${stu.id}`}
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
    </div>
  );
}
