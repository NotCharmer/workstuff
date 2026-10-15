import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { TutoringTimetableGrid } from "@/components/timetable/tutoring-timetable-grid";

export const dynamic = "force-dynamic";

export default async function TutoringTimetablePage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);

  const [cadets, pulls] = branchId
    ? await Promise.all([
        prisma.student.findMany({
          where: { branchId, status: "ACTIVE", needsTutoring: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            className: true,
            needsTutoring: true,
            tutoringUrgency: true,
            tutoringScheduledFor: true,
          },
          orderBy: [{ className: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
        }),
        prisma.lessonMark.findMany({
          where: { userId: user.id, branchId, tutoringPull: true },
          select: {
            className: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            subject: true,
          },
          orderBy: [{ startTime: "asc" }, { className: "asc" }],
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {he.timetable.tutoringTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.timetable.tutoringSubtitle}</p>
      </div>
      <TutoringTimetableGrid cadets={cadets} pulls={pulls} />
    </div>
  );
}
