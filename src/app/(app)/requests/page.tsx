import { prisma } from "@/lib/db";
import { getCurrentUserOrRedirect } from "@/lib/auth";
import { getViewBranchId } from "@/lib/branch-scope";
import { RequestsClient, type RequestRow } from "./requests-client";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await getCurrentUserOrRedirect();
  const branchId = await getViewBranchId(user);

  const [students, requests] = await Promise.all([
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
  ]);

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
  }));

  return (
    <RequestsClient
      students={students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        className: s.className,
      }))}
      initialRequests={initialRequests}
    />
  );
}
