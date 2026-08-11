import assert from "node:assert/strict";
import {
  canRemapDayColumn,
  canRemapTimeSlot,
  occupiedDaysExcept,
} from "./edit-guards";

function dayRows(...days: string[]) {
  return days.map((dayOfWeek) => ({ dayOfWeek }));
}

function timeRows(...slots: Array<[string, string]>) {
  return slots.map(([startTime, endTime]) => ({ startTime, endTime }));
}

assert.equal(canRemapDayColumn(dayRows("ראשון", "שני"), "ראשון", "ראשון"), true);
assert.equal(canRemapDayColumn(dayRows("ראשון", "שני"), "ראשון", "שלישי"), true);
assert.equal(
  canRemapDayColumn(dayRows("ראשון", "שני"), "ראשון", "שני"),
  false,
  "remapping onto an existing day must be rejected to avoid silent merge/wipe"
);

assert.equal(
  canRemapTimeSlot(timeRows(["08:00", "08:45"], ["09:00", "09:45"]), "08:00", "08:45", "08:00", "08:45"),
  true
);
assert.equal(
  canRemapTimeSlot(timeRows(["08:00", "08:45"], ["09:00", "09:45"]), "08:00", "08:45", "10:00", "10:45"),
  true
);
assert.equal(
  canRemapTimeSlot(timeRows(["08:00", "08:45"], ["09:00", "09:45"]), "08:00", "08:45", "09:00", "09:45"),
  false,
  "remapping onto an existing slot must be rejected"
);
assert.equal(
  canRemapTimeSlot(timeRows(["08:00", "08:45"], ["08:00", "08:45"]), "08:00", "08:45", "09:00", "09:45"),
  true,
  "all rows in the old slot may move together to an unused slot"
);

const occupied = occupiedDaysExcept(dayRows("ראשון", "שני", "ראשון"), "ראשון");
assert.deepEqual([...occupied].sort(), ["שני"]);

console.log("edit-guards tests passed");
