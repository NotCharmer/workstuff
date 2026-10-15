import Link from "next/link";
import { Star, UserMinus } from "lucide-react";
import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimetableUploader } from "@/components/timetable/timetable-uploader";
import { EditableTimetableGrid } from "@/components/timetable/editable-timetable-grid";
import { ManualTimetableCreate } from "@/components/timetable/manual-timetable-create";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { lessonMarkKey } from "@/lib/timetable/marks";
import type { LessonMarkFlags } from "@/lib/timetable/marks";

export const dynamic = "force-dynamic";

export default async function TimetablePage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);
  const entries = await prisma.timetableEntry.findMany({
    where: { branchId: branchId },
    orderBy: [{ className: "asc" }, { startTime: "asc" }],
  });
  const marks = user.id && branchId
    ? await prisma.lessonMark.findMany({
        where: { userId: user.id, branchId },
      })
    : [];
  const marksByKey = new Map<string, LessonMarkFlags>();
  for (const m of marks) {
    marksByKey.set(lessonMarkKey(m), {
      important: m.important,
      tutoringPull: m.tutoringPull,
    });
  }

  const slotsBySubject = new Map<string, Set<string>>();
  for (const e of entries) {
    const subject = e.subject.trim();
    const set = slotsBySubject.get(subject) ?? new Set<string>();
    set.add(lessonMarkKey(e));
    slotsBySubject.set(subject, set);
  }
  const subjectWideImportant: Record<string, boolean> = {};
  for (const [subject, keys] of slotsBySubject) {
    subjectWideImportant[subject] =
      keys.size > 0 && [...keys].every((key) => marksByKey.get(key)?.important);
  }

  const grouped = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = grouped.get(e.className) ?? [];
    arr.push(e);
    grouped.set(e.className, arr);
  }
  const classes = [...grouped.keys()];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{he.timetable.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{he.timetable.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/my-timetable">
              <Star className="h-4 w-4" />
              {he.nav.myTimetable}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/tutoring-timetable">
              <UserMinus className="h-4 w-4" />
              {he.nav.tutoringTimetable}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{he.timetable.uploadTitle}</CardTitle>
          <CardDescription>{he.timetable.uploadDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <TimetableUploader />
        </CardContent>
      </Card>

      <ManualTimetableCreate existingClasses={classes} />

      {classes.length > 0 && (
        <Tabs defaultValue={classes[0]} className="space-y-4">
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
            {classes.map((className) => (
              <TabsTrigger key={className} value={className} className="min-w-[120px]">
                {className}
              </TabsTrigger>
            ))}
          </TabsList>

          {classes.map((className) => {
            const rows = grouped.get(className) ?? [];
            const classMarks: Record<string, LessonMarkFlags> = {};
            for (const r of rows) {
              const key = lessonMarkKey(r);
              const flags = marksByKey.get(key);
              if (flags) classMarks[key] = flags;
            }

            return (
              <TabsContent key={className} value={className}>
                <EditableTimetableGrid
                  className={className}
                  initialMarks={classMarks}
                  subjectWideImportant={subjectWideImportant}
                  initialRows={rows.map((r) => ({
                    id: r.id,
                    className: r.className,
                    dayOfWeek: r.dayOfWeek,
                    startTime: r.startTime,
                    endTime: r.endTime,
                    subject: r.subject,
                    teacher: r.teacher,
                    room: r.room,
                  }))}
                />
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}
