import Link from "next/link";
import { addDays, sydneyMinutes, fmtTime, minutesToLabel, fmtSydney, durationLabel } from "@/lib/time";
import { isSplit } from "../_components/StatusBadge";

const DEFAULT_START = 7 * 60;
const DEFAULT_END = 20 * 60;
const PX_PER_MIN = 1;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Block = { id: string; startsAt: Date; endsAt: Date; customerName: string; title: string; status: string; pickupSuburb: string; durationMins: number };
type Blocked = { id: string; startsAt: Date; endsAt: Date; reason: string | null };

const dayOf = (d: Date) => fmtSydney(d, "yyyy-MM-dd");

/** Minutes-from-midnight span of [start, end) on Sydney calendar day `dayStr`, or null if it doesn't touch that day. */
function spanOn(dayStr: string, start: Date, end: Date) {
  const sDay = dayOf(start);
  const eDay = dayOf(end);
  const s = sDay === dayStr ? sydneyMinutes(start) : sDay < dayStr ? 0 : null;
  const e = eDay === dayStr ? sydneyMinutes(end) : eDay > dayStr ? 24 * 60 : null;
  if (s == null || e == null || e <= s) return null;
  return { s, e };
}

const COLORS: Record<string, string> = {
  CONFIRMED: "bg-brand-100 border-brand-500 text-brand-900",
  COMPLETED: "bg-green-100 border-green-600 text-green-900",
  NO_SHOW: "bg-amber-100 border-amber-500 text-amber-900",
};

export function WeekCalendar({
  monday,
  today,
  bookings,
  blocked,
  holidays,
}: {
  monday: string;
  today: string;
  bookings: Block[];
  blocked: Blocked[];
  holidays: Record<string, string>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  // Widen the visible hours so early/late (staff-override) lessons are never hidden off the grid.
  let dayStart = DEFAULT_START;
  let dayEnd = DEFAULT_END;
  for (const b of bookings) {
    for (const d of days) {
      const sp = spanOn(d, b.startsAt, b.endsAt);
      if (!sp) continue;
      dayStart = Math.min(dayStart, Math.floor(sp.s / 60) * 60);
      dayEnd = Math.max(dayEnd, Math.ceil(sp.e / 60) * 60);
    }
  }
  const hours: number[] = [];
  for (let m = dayStart; m <= dayEnd; m += 60) hours.push(m);
  const height = (dayEnd - dayStart) * PX_PER_MIN;
  const place = (sp: { s: number; e: number } | null) => {
    if (!sp) return null;
    const top = Math.max(sp.s, dayStart);
    const bottom = Math.min(sp.e, dayEnd);
    if (bottom <= top) return null;
    return { top: (top - dayStart) * PX_PER_MIN, height: (bottom - top) * PX_PER_MIN };
  };

  return (
    <>
      {/* Phone: agenda list, one card per day (no sideways scrolling) */}
      <ol className="space-y-3 md:hidden">
        {days.map((d, i) => {
          const dayBookings = bookings.filter((b) => dayOf(b.startsAt) === d);
          const dayBlocked = blocked.filter((x) => spanOn(d, x.startsAt, x.endsAt));
          const isToday = d === today;
          return (
            <li key={d} className={`card p-0 ${isToday ? "border-brand-500 ring-1 ring-brand-500" : ""}`}>
              <div className={`flex items-center justify-between rounded-t-2xl px-4 py-2 ${isToday ? "bg-brand-700 text-white" : "bg-surface"}`}>
                <p className="font-bold">
                  {DAYS[i]} {Number(d.slice(8))}/{Number(d.slice(5, 7))}
                  {isToday && <span className="ml-2 text-xs font-semibold uppercase">Today</span>}
                </p>
                <p className={`text-xs ${isToday ? "text-white/90" : "text-muted"}`}>
                  {dayBookings.length ? `${dayBookings.length} lesson${dayBookings.length === 1 ? "" : "s"}` : "Free"}
                </p>
              </div>
              {holidays[d] && <p className="px-4 pt-2 text-sm font-semibold text-danger">Public holiday · {holidays[d]}</p>}
              {dayBookings.length === 0 && dayBlocked.length === 0 && !holidays[d] ? null : (
                <ul className="divide-y divide-line">
                  {dayBlocked.map((x) => {
                    const sp = spanOn(d, x.startsAt, x.endsAt)!;
                    return (
                      <li key={x.id} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600">
                        <span className="w-20 shrink-0 tabular-nums">{sp.s === 0 && sp.e === 1440 ? "All day" : `${minutesToLabel(sp.s)}`}</span>
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-semibold">Blocked</span>
                        <span className="truncate">{x.reason ?? ""}</span>
                      </li>
                    );
                  })}
                  {dayBookings.map((b) => (
                    <li key={b.id}>
                      <Link href={`/admin/bookings/${b.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 transition active:bg-surface hover:bg-surface">
                        <span className="w-20 shrink-0 text-sm font-bold tabular-nums">{fmtTime(b.startsAt)}</span>
                        <span className={`h-9 w-1 shrink-0 rounded-full border-l-4 ${COLORS[b.status] ?? COLORS.CONFIRMED}`} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{b.customerName}</span>
                          <span className="block truncate text-xs text-muted">
                            {durationLabel(b.durationMins)} · {b.pickupSuburb}
                            {b.status !== "CONFIRMED" && ` · ${b.status === "NO_SHOW" ? "No-show" : "Completed"}`}
                            {isSplit(b) && " · split lesson"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {/* Tablet / desktop: time grid */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <div className="grid min-w-[720px]" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
          <div className="sticky top-0 border-b border-line bg-surface" />
          {days.map((d, i) => (
            <div
              key={d}
              className={`border-b border-l border-line px-2 py-2 text-center text-xs font-bold ${d === today ? "bg-brand-700 text-white" : "bg-surface"}`}
              aria-current={d === today ? "date" : undefined}
            >
              {DAYS[i]} {Number(d.slice(8))}/{Number(d.slice(5, 7))}
              {holidays[d] && (
                <span className={`block truncate font-semibold ${d === today ? "text-white" : "text-danger"}`} title={holidays[d]}>
                  {holidays[d]}
                </span>
              )}
            </div>
          ))}
          <div className="relative" style={{ height }}>
            {hours.map((m) => (
              <span key={m} className="absolute right-1 -translate-y-1/2 text-[10px] text-muted" style={{ top: (m - dayStart) * PX_PER_MIN }}>
                {m < dayEnd && m > dayStart ? minutesToLabel(m).replace(":00", "") : ""}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <div key={d} className={`relative border-l border-line ${holidays[d] ? "bg-red-50/50" : d === today ? "bg-brand-50/40" : ""}`} style={{ height }}>
              {hours.map((m) => (
                <div key={m} className="absolute inset-x-0 border-t border-line/60" style={{ top: (m - dayStart) * PX_PER_MIN }} />
              ))}
              {blocked.map((x) => {
                const pos = place(spanOn(d, x.startsAt, x.endsAt));
                return pos ? (
                  <div
                    key={x.id}
                    className="absolute inset-x-0.5 overflow-hidden rounded bg-slate-200/80 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,.6)_6px,rgba(255,255,255,.6)_12px)] p-1 text-[10px] text-slate-600"
                    style={pos}
                    title={x.reason ?? "Blocked"}
                  >
                    {x.reason ?? "Blocked"}
                  </div>
                ) : null;
              })}
              {bookings.map((b) => {
                const pos = place(spanOn(d, b.startsAt, b.endsAt));
                return pos ? (
                  <Link
                    key={b.id}
                    href={`/admin/bookings/${b.id}`}
                    className={`absolute inset-x-0.5 overflow-hidden rounded border-l-4 p-1 text-[11px] leading-tight shadow-sm transition hover:z-10 hover:ring-2 hover:ring-brand-500 focus-visible:z-10 ${COLORS[b.status] ?? COLORS.CONFIRMED}`}
                    style={pos}
                    title={`${fmtTime(b.startsAt)} ${b.customerName} — ${b.title}, ${b.pickupSuburb}`}
                  >
                    <span className="block font-bold">{fmtTime(b.startsAt)}</span>
                    <span className="block truncate font-semibold">{b.customerName}</span>
                    <span className="block truncate">{b.pickupSuburb}</span>
                  </Link>
                ) : null;
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
