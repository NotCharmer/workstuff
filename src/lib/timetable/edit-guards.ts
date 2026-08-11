/**
 * Guards for editable timetable grid remaps.
 * Remapping a day column or time slot onto an already-used value silently
 * merges lessons; confirm then wholesale-replaces the class and permanently
 * drops the vacated day/slot.
 */

export type DayKeyed = { dayOfWeek: string };
export type TimeKeyed = { startTime: string; endTime: string };

export function canRemapDayColumn(
  rows: DayKeyed[],
  oldDay: string,
  newDay: string
): boolean {
  if (oldDay === newDay) return true;
  return !rows.some((r) => r.dayOfWeek === newDay);
}

export function canRemapTimeSlot(
  rows: TimeKeyed[],
  oldStartTime: string,
  oldEndTime: string,
  newStartTime: string,
  newEndTime: string
): boolean {
  if (oldStartTime === newStartTime && oldEndTime === newEndTime) return true;
  return !rows.some(
    (r) =>
      (r.startTime !== oldStartTime || r.endTime !== oldEndTime) &&
      r.startTime === newStartTime &&
      r.endTime === newEndTime
  );
}

/** Days already present in the grid, excluding the column being edited. */
export function occupiedDaysExcept(rows: DayKeyed[], currentDay: string): Set<string> {
  const occupied = new Set<string>();
  for (const r of rows) {
    if (r.dayOfWeek !== currentDay) occupied.add(r.dayOfWeek);
  }
  return occupied;
}
