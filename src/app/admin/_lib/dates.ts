import { todaySydney, addDays, weekdayOf, sydneyDayRange } from "@/lib/time";

/** Monday (YYYY-MM-DD) of the Sydney week containing `date`. */
export function mondayOf(date: string) {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

export function weekRange(date = todaySydney()) {
  const mon = mondayOf(date);
  return { mon, start: sydneyDayRange(mon).start, end: sydneyDayRange(addDays(mon, 6)).end };
}

export function validIso(s: string | undefined | null, fallback: string) {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : fallback;
}

export function mapsUrl(address: string, suburb: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${suburb} NSW`)}`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
export const minutesToHHMM = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
