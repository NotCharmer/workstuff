/**
 * Replace class timetables without an interactive Prisma transaction.
 *
 * Neon/serverless (and the HTTP Prisma adapter) does not reliably support
 * `prisma.$transaction(async ...)`. Delete-then-insert is unsafe: if insert
 * fails after the deletes, the class schedule is gone. Snapshot existing IDs,
 * insert the new rows, then delete only the snapshotted IDs so a failed
 * recreate leaves the previous schedule in place.
 */

export type TimetableReplaceRow = {
  branchId: string | null;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string | null;
  room: string | null;
  source: string;
};

export type TimetableReplaceStore = {
  timetableEntry: {
    findMany: (args: {
      where: { branchId: string | null; className: { in: string[] } };
      select: { id: true };
    }) => Promise<{ id: string }[]>;
    createMany: (args: { data: TimetableReplaceRow[] }) => Promise<unknown>;
    deleteMany: (args: { where: { id: { in: string[] } } }) => Promise<unknown>;
  };
};

export async function replaceTimetableEntries(
  db: TimetableReplaceStore,
  args: {
    branchId: string | null;
    classes: string[];
    rows: TimetableReplaceRow[];
  }
): Promise<void> {
  const existing =
    args.classes.length === 0
      ? []
      : await db.timetableEntry.findMany({
          where: { branchId: args.branchId, className: { in: args.classes } },
          select: { id: true },
        });

  await db.timetableEntry.createMany({ data: args.rows });

  const deleteIds = existing.map((row) => row.id);
  if (deleteIds.length > 0) {
    await db.timetableEntry.deleteMany({ where: { id: { in: deleteIds } } });
  }
}
