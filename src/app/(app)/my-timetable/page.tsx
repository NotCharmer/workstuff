import { prisma } from "@/lib/db";
import { he } from "@/lib/i18n/he";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { PersonalTimetableGrid } from "@/components/timetable/personal-timetable-grid";

export const dynamic = "force-dynamic";

export default async function MyTimetablePage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);
  const [marks, customSlots] = branchId
    ? await Promise.all([
        prisma.lessonMark.findMany({
          where: {
            userId: user.id,
            branchId,
            OR: [{ important: true }, { tutoringPull: true }],
          },
          orderBy: [{ startTime: "asc" }, { className: "asc" }],
        }),
        prisma.personalSlot.findMany({
          where: { userId: user.id, branchId },
          orderBy: [{ startTime: "asc" }],
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{he.timetable.myTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{he.timetable.mySubtitle}</p>
      </div>

      <PersonalTimetableGrid
        lessons={marks.map((m) => ({
          className: m.className,
          dayOfWeek: m.dayOfWeek,
          startTime: m.startTime,
          endTime: m.endTime,
          subject: m.subject,
          important: m.important,
          tutoringPull: m.tutoringPull,
        }))}
        customSlots={customSlots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          title: s.title,
        }))}
      />
    </div>
  );
}
