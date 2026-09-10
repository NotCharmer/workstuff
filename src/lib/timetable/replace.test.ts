import assert from "node:assert/strict";

import {
  replaceTimetableEntries,
  type TimetableReplaceRow,
  type TimetableReplaceStore,
} from "./replace";

type Stored = TimetableReplaceRow & { id: string };

function row(
  id: string,
  patch: Partial<TimetableReplaceRow> & Pick<TimetableReplaceRow, "className" | "subject">
): Stored {
  return {
    id,
    branchId: "branch-1",
    dayOfWeek: "ראשון",
    startTime: "08:15",
    endTime: "09:00",
    teacher: null,
    room: null,
    source: "IMPORT",
    ...patch,
  };
}

function createStore(
  initial: Stored[],
  failAt?: "insert" | "delete"
): { db: TimetableReplaceStore; rows: () => Stored[] } {
  let rows = [...initial];
  let nextId = 100;
  const db: TimetableReplaceStore = {
    timetableEntry: {
      async findMany({ where }) {
        return rows
          .filter(
            (entry) =>
              entry.branchId === where.branchId &&
              where.className.in.includes(entry.className)
          )
          .map((entry) => ({ id: entry.id }));
      },
      async createMany({ data }) {
        if (failAt === "insert") throw new Error("insert failed");
        rows = [
          ...rows,
          ...data.map((entry) => ({ ...entry, id: `new-${nextId++}` })),
        ];
      },
      async deleteMany({ where }) {
        if (failAt === "delete") throw new Error("delete failed");
        const ids = new Set(where.id.in);
        rows = rows.filter((entry) => !ids.has(entry.id));
      },
    },
  };
  return { db, rows: () => rows };
}

const existing = [
  row("old-math", { className: "יא3", subject: "מתמטיקה" }),
  row("old-physics", { className: "יא3", subject: "פיזיקה", startTime: "09:00", endTime: "09:45" }),
  row("other-class", { className: "יב1", subject: "פייתון" }),
];

const incoming: TimetableReplaceRow[] = [
  {
    branchId: "branch-1",
    className: "יא3",
    dayOfWeek: "שני",
    startTime: "08:15",
    endTime: "09:00",
    subject: "פייתון",
    teacher: null,
    room: null,
    source: "IMPORT",
  },
];

async function main() {
  {
    const { db, rows } = createStore(existing, "insert");
    await assert.rejects(
      () =>
        replaceTimetableEntries(db, {
          branchId: "branch-1",
          classes: ["יא3"],
          rows: incoming,
        }),
      /insert failed/
    );
    assert.deepEqual(
      rows().map((entry) => entry.id),
      ["old-math", "old-physics", "other-class"],
      "failed recreate must not wipe the previous class schedule"
    );
  }

  {
    const { db, rows } = createStore(existing, "delete");
    await assert.rejects(
      () =>
        replaceTimetableEntries(db, {
          branchId: "branch-1",
          classes: ["יא3"],
          rows: incoming,
        }),
      /delete failed/
    );
    const ids = rows().map((entry) => entry.id);
    assert.ok(ids.includes("old-math") && ids.includes("old-physics"));
    assert.ok(ids.some((id) => id.startsWith("new-")));
    assert.ok(ids.includes("other-class"));
  }

  {
    const { db, rows } = createStore(existing);
    await replaceTimetableEntries(db, {
      branchId: "branch-1",
      classes: ["יא3"],
      rows: incoming,
    });
    const remaining = rows();
    assert.equal(remaining.length, 2);
    assert.ok(remaining.some((entry) => entry.className === "יא3" && entry.subject === "פייתון"));
    assert.ok(remaining.some((entry) => entry.id === "other-class"));
    assert.equal(
      remaining.filter((entry) => entry.id === "old-math" || entry.id === "old-physics").length,
      0
    );
  }

  console.log("timetable replace tests passed");
}

void main();
