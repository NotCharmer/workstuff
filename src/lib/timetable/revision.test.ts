import assert from "node:assert/strict";
import {
  findStaleClassRevision,
  isStaleClassRevision,
  maxUpdatedAtIso,
} from "./revision";

const t1 = "2026-08-11T10:00:00.000Z";
const t2 = "2026-08-11T11:00:00.000Z";
const t3 = "2026-08-11T12:00:00.000Z";

assert.equal(maxUpdatedAtIso([]), null);
assert.equal(maxUpdatedAtIso([null, undefined]), null);
assert.equal(maxUpdatedAtIso([t1, t3, t2]), t3);
assert.equal(maxUpdatedAtIso([new Date(t2), t1]), t2);

assert.equal(isStaleClassRevision(undefined, t2), false, "import path has no baseline");
assert.equal(isStaleClassRevision(null, t2), false);
assert.equal(isStaleClassRevision(t1, null), false, "empty class is not stale");
assert.equal(isStaleClassRevision(t1, t1), false, "same revision may save");
assert.equal(isStaleClassRevision(t2, t1), false, "older DB is not a lost-update");
assert.equal(
  isStaleClassRevision(t1, t2),
  true,
  "newer DB revision must reject stale editor save"
);

const actual = new Map<string, string | null>([
  ["יא3", t2],
  ["יב1", t1],
]);
assert.equal(findStaleClassRevision(undefined, actual), null);
assert.equal(findStaleClassRevision([], actual), null);
assert.equal(
  findStaleClassRevision([{ className: "יא3", maxUpdatedAt: t2 }], actual),
  null
);
assert.equal(
  findStaleClassRevision([{ className: "יא3", maxUpdatedAt: t1 }], actual),
  "יא3"
);
assert.equal(
  findStaleClassRevision(
    [
      { className: "יב1", maxUpdatedAt: t1 },
      { className: "יא3", maxUpdatedAt: t1 },
    ],
    actual
  ),
  "יא3"
);

console.log("timetable revision tests passed");
