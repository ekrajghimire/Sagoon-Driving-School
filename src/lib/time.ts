import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** All business logic runs in Sydney time; the database stores UTC. DST is handled by the IANA zone. */
export const TZ = "Australia/Sydney";

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-10" + 540 (minutes) → UTC Date for 9:00am Sydney on that day. */
export function sydneyToUtc(date: string, minutes: number): Date {
  return fromZonedTime(`${date}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`, TZ);
}

/** Start and end (exclusive) of a Sydney calendar day in UTC. Handles 23h/25h DST days. */
export function sydneyDayRange(date: string) {
  return { start: sydneyToUtc(date, 0), end: sydneyToUtc(addDays(date, 1), 0) };
}

export function todaySydney(now: Date = new Date()) {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** A real calendar date in YYYY-MM-DD form (rejects e.g. 2026-02-31, which Date would roll over). */
export function isIsoDate(s: string) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Day of week (0 = Sunday) for a calendar date — independent of time zone. */
export function weekdayOf(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function fmtSydney(d: Date, pattern: string) {
  return formatInTimeZone(d, TZ, pattern);
}

/** e.g. "Tue 10 Nov 2026" */
export const fmtDate = (d: Date) => fmtSydney(d, "EEE d MMM yyyy");
/** e.g. "9:30 AM" */
export const fmtTime = (d: Date) => fmtSydney(d, "h:mm a");
/** e.g. "9:00 AM – 10:00 AM" */
export const fmtRange = (start: Date, end: Date) => `${fmtTime(start)} – ${fmtTime(end)}`;
/** e.g. "Tue 10 Nov, 9:30am" */
export const fmtDateTime = (d: Date) => fmtSydney(d, "EEE d MMM, h:mm a");

export function minutesToLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function durationLabel(mins: number) {
  if (mins % 60 === 0) return `${mins / 60} hr${mins === 60 ? "" : "s"}`;
  return `${(mins / 60).toFixed(1)} hrs`;
}

/** Minutes since local midnight for a UTC instant, in Sydney time. */
export function sydneyMinutes(d: Date) {
  const [h, m] = fmtSydney(d, "H:m").split(":").map(Number);
  return h * 60 + m;
}
