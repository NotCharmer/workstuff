import { GraduationCap, Clock, Users, BookOpen } from "lucide-react";

import { prisma } from "@/lib/db";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { he } from "@/lib/i18n/he";
import { PrivateLessonsClient } from "./private-lessons-client";

export const dynamic = "force-dynamic";

export default async function PrivateLessonsPage() {
  const [students, lessons] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        className: true,
        avatarHue: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.privateLesson.findMany({
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            className: true,
            avatarHue: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const totalLessons = lessons.length;
  const totalMinutes = lessons.reduce((s, l) => s + l.durationMinutes, 0);
  const studentsWithLessons = new Set(lessons.map((l) => l.studentId)).size;

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lessonsThisMonth = lessons.filter((l) => l.date.startsWith(monthPrefix)).length;

  const perStudent = new Map<
    string,
    {
      id: string;
      name: string;
      className: string | null;
      avatarHue: number;
      count: number;
      minutes: number;
      lastDate: string | null;
    }
  >();
  for (const l of lessons) {
    const key = l.studentId;
    const existing = perStudent.get(key);
    const name = `${l.student.firstName} ${l.student.lastName}`;
    if (existing) {
      existing.count += 1;
      existing.minutes += l.durationMinutes;
      if (!existing.lastDate || l.date > existing.lastDate) existing.lastDate = l.date;
    } else {
      perStudent.set(key, {
        id: l.studentId,
        name,
        className: l.student.className,
        avatarHue: l.student.avatarHue,
        count: 1,
        minutes: l.durationMinutes,
        lastDate: l.date,
      });
    }
  }
  const perStudentList = [...perStudent.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {he.privateLessons.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{he.privateLessons.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={he.privateLessons.metricTotal}
          value={totalLessons}
          hint={he.privateLessons.metricTotalHint(lessonsThisMonth)}
          icon={GraduationCap}
        />
        <MetricCard
          label={he.privateLessons.metricMinutes}
          value={`${totalMinutes}`}
          hint={he.privateLessons.metricMinutesHint(Math.round(totalMinutes / 60))}
          icon={Clock}
          tone="info"
        />
        <MetricCard
          label={he.privateLessons.metricStudents}
          value={studentsWithLessons}
          hint={he.privateLessons.metricStudentsHint(students.length)}
          icon={Users}
          tone="success"
        />
        <MetricCard
          label={he.privateLessons.metricThisMonth}
          value={lessonsThisMonth}
          hint={he.privateLessons.metricThisMonthHint}
          icon={BookOpen}
          tone="warning"
        />
      </div>

      <PrivateLessonsClient
        students={students.map((s) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          className: s.className,
          avatarHue: s.avatarHue,
        }))}
        initialLessons={lessons.map((l) => ({
          id: l.id,
          studentId: l.studentId,
          studentName: `${l.student.firstName} ${l.student.lastName}`,
          studentClassName: l.student.className,
          studentAvatarHue: l.student.avatarHue,
          date: l.date,
          durationMinutes: l.durationMinutes,
          subject: l.subject,
          notes: l.notes,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle>{he.privateLessons.perStudentTitle}</CardTitle>
          <CardDescription>{he.privateLessons.perStudentDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {perStudentList.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {he.privateLessons.perStudentEmpty}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {perStudentList.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.className ?? "—"}
                      {s.lastDate && ` · ${he.privateLessons.lastOn(s.lastDate)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                      {he.privateLessons.lessonsCount(s.count)}
                    </span>
                    <span className="hidden sm:inline">
                      {he.privateLessons.minutesShort(s.minutes)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
