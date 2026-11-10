import { sydneyToUtc, fmtTime, fmtRange, weekdayOf, todaySydney, addDays } from "./time";

/**
 * Pure availability engine — no database or network access, so it is fully unit-tested.
 *
 * A start time is offered only if:
 *  - it lies inside the instructor's working hours for that weekday,
 *  - the day is not a public holiday,
 *  - it respects the minimum notice and maximum advance window,
 *  - the whole lesson plus the travel buffer either side does not touch any busy interval
 *    (existing bookings, blocked-off time, and busy events on the owner's Google Calendar).
 */

export type BusyInterval = { start: Date; end: Date; source: "booking" | "blocked" | "google" };

export type AvailabilityInput = {
  date: string; // YYYY-MM-DD, Sydney
  durationMins: number;
  workingHours: { startMin: number; endMin: number }[];
  isHoliday: boolean;
  busy: BusyInterval[];
  bufferMins: number;
  slotIntervalMins: number;
  minNoticeHours: number;
  maxAdvanceDays: number;
  now: Date;
};

export type Slot = { startMin: number; start: Date; end: Date; label: string; range: string };
/** A start time within working hours, with whether it can be booked and, if not, why. */
export type GridSlot = Slot & { available: boolean; reason?: "booked" | "too_soon" };

export function overlapsWithBuffer(start: Date, end: Date, busy: BusyInterval[], bufferMins: number) {
  const buf = bufferMins * 60_000;
  return busy.some((b) => {
    // Blocked time is the owner's own choice, so no travel buffer is added around it.
    const pad = b.source === "blocked" ? 0 : buf;
    return start.getTime() < b.end.getTime() + pad && end.getTime() > b.start.getTime() - pad;
  });
}

export function isDateBookable(input: Pick<AvailabilityInput, "date" | "maxAdvanceDays" | "now">) {
  const today = todaySydney(input.now);
  return input.date >= today && input.date <= addDays(today, input.maxAdvanceDays);
}

/**
 * Every start time inside working hours for the day, each marked available or not
 * ("booked" = clashes with a lesson, blocked time or Google Calendar event incl. travel buffer;
 *  "too_soon" = inside the minimum-notice window). Closed days return [].
 */
export function generateSlotGrid(input: AvailabilityInput): GridSlot[] {
  if (input.isHoliday || !isDateBookable(input)) return [];
  const earliest = input.now.getTime() + input.minNoticeHours * 3_600_000;
  const grid: GridSlot[] = [];
  const seen = new Set<number>();

  for (const wh of [...input.workingHours].sort((a, b) => a.startMin - b.startMin)) {
    for (let m = wh.startMin; m + input.durationMins <= wh.endMin; m += input.slotIntervalMins) {
      if (seen.has(m)) continue;
      seen.add(m);
      const start = sydneyToUtc(input.date, m);
      const end = new Date(start.getTime() + input.durationMins * 60_000);
      const slot = { startMin: m, start, end, label: fmtTime(start), range: fmtRange(start, end) };
      if (start.getTime() < earliest) grid.push({ ...slot, available: false, reason: "too_soon" });
      else if (overlapsWithBuffer(start, end, input.busy, input.bufferMins)) grid.push({ ...slot, available: false, reason: "booked" });
      else grid.push({ ...slot, available: true });
    }
  }
  return grid.sort((a, b) => a.startMin - b.startMin);
}

/** Only the bookable start times. */
export function generateSlots(input: AvailabilityInput): Slot[] {
  return generateSlotGrid(input)
    .filter((s) => s.available)
    .map(({ startMin, start, end, label, range }) => ({ startMin, start, end, label, range }));
}

export function workingHoursFor<T extends { weekday: number }>(date: string, rows: T[]) {
  const wd = weekdayOf(date);
  return rows.filter((r) => r.weekday === wd);
}
