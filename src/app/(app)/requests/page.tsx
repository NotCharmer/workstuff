import { prisma } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { RequestsClient, type RequestRow } from "./requests-client";
import type { PlanSlot } from "@/lib/requests/tutoring-plan";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);

  const [students, requests, lessons, marks] = await Promise.all([
    prisma.student.findMany({
      where: { branchId, status: "ACTIVE" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        className: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.request.findMany({
      where: { branchId: branchId ?? null },
      include: {
        author: { select: { id: true, name: true } },
        student: {
          select: { id: true, firstName: true, lastName: true, className: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    branchId
      ? prisma.timetableEntry.findMany({
          where: { branchId },
          select: {
            className: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            subject: true,
          },
        })
      : Promise.resolve([] as PlanSlot[]),
    branchId
      ? prisma.lessonMark.findMany({
          where: {
            userId: user.id,
            branchId,
            OR: [{ important: true }, { tutoringPull: true }],
          },
          select: {
            className: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            subject: true,
            important: true,
            tutoringPull: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const pulls = marks.filter((mark) => mark.tutoringPull);
  const coverage = marks;

  const initialRequests: RequestRow[] = requests.map((r) => ({
    id: r.id,
    kind: r.kind === "EQUIPMENT" ? "EQUIPMENT" : "TUTORING",
    title: r.title,
    details: r.details,
    quantity: r.quantity,
    status: r.status === "DONE" ? "DONE" : "OPEN",
    createdAt: r.createdAt.toISOString(),
    authorName: r.author?.name ?? null,
    studentId: r.student?.id ?? null,
    studentName: r.student ? `${r.student.firstName} ${r.student.lastName}` : null,
    studentClassName: r.student?.className ?? null,
    tutoringDoneCount: r.tutoringDoneCount,
  }));

  return (
    <RequestsClient
      students={students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        className: s.className,
      }))}
      initialRequests={initialRequests}
      lessons={lessons}
      pulls={pulls}
      coverage={coverage}
    />
  );
}
