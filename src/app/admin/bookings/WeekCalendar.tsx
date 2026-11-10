import Link from "next/link";
import { addDays, sydneyMinutes, fmtTime, minutesToLabel } from "@/lib/time";
import { fmtSydney } from "@/lib/time";

const DAY_START = 7 * 60;
const DAY_END = 20 * 60;
const PX_PER_MIN = 1;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Block = { id: string; startsAt: Date; endsAt: Date; customerName: string; title: string; status: string; pickupSuburb: string };
type Blocked = { id: string; startsAt: Date; endsAt: Date; reason: string | null };

function clampBlock(dayStr: string, start: Date, end: Date) {
  const s = fmtSydney(start, "yyyy-MM-dd") === dayStr ? sydneyMinutes(start) : fmtSydney(start, "yyyy-MM-dd") < dayStr ? 0 : null;
  const e = fmtSydney(end, "yyyy-MM-dd") === dayStr ? sydneyMinutes(end) : fmtSydney(end, "yyyy-MM-dd") > dayStr ? 24 * 60 : null;
  if (s == null || e == null) return null;
  const top = Math.max(s, DAY_START);
  const bottom = Math.min(e, DAY_END);
  if (bottom <= top) return null;
  return { top: (top - DAY_START) * PX_PER_MIN, height: (bottom - top) * PX_PER_MIN };
}

const COLORS: Record<string, string> = {
  CONFIRMED: "bg-brand-100 border-brand-500 text-brand-900",
  COMPLETED: "bg-green-100 border-green-600 text-green-900",
  NO_SHOW: "bg-amber-100 border-amber-500 text-amber-900",
};

export function WeekCalendar({ monday, bookings, blocked, holidays }: { monday: string; bookings: Block[]; blocked: Blocked[]; holidays: Record<string, string> }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const hours: number[] = [];
  for (let m = DAY_START; m <= DAY_END; m += 60) hours.push(m);
  const height = (DAY_END - DAY_START) * PX_PER_MIN;

  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "56px repeat(7, minmax(0, 1fr))" }}>
        <div className="border-b border-line bg-surface" />
        {days.map((d, i) => (
          <div key={d} className="border-b border-l border-line bg-surface px-2 py-2 text-center text-xs font-bold">
            {DAYS[i]} {Number(d.slice(8))}/{Number(d.slice(5, 7))}
            {holidays[d] && <span className="block truncate font-semibold text-danger" title={holidays[d]}>{holidays[d]}</span>}
          </div>
        ))}
        <div className="relative" style={{ height }}>
          {hours.map((m) => (
            <span key={m} className="absolute right-1 -translate-y-1/2 text-[10px] text-muted" style={{ top: (m - DAY_START) * PX_PER_MIN }}>
              {m < DAY_END ? minutesToLabel(m).replace(":00", "") : ""}
            </span>
          ))}
        </div>
        {days.map((d) => (
          <div key={d} className={`relative border-l border-line ${holidays[d] ? "bg-red-50/50" : ""}`} style={{ height }}>
            {hours.map((m) => (
              <div key={m} className="absolute inset-x-0 border-t border-line/60" style={{ top: (m - DAY_START) * PX_PER_MIN }} />
            ))}
            {blocked.map((x) => {
              const pos = clampBlock(d, x.startsAt, x.endsAt);
              return pos ? (
                <div key={x.id} className="absolute inset-x-0.5 rounded bg-slate-200/80 bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(255,255,255,.6)_6px,rgba(255,255,255,.6)_12px)] p-1 text-[10px] text-slate-600" style={pos} title={x.reason ?? "Blocked"}>
                  {x.reason ?? "Blocked"}
                </div>
              ) : null;
            })}
            {bookings.map((b) => {
              const pos = clampBlock(d, b.startsAt, b.endsAt);
              return pos ? (
                <Link
                  key={b.id}
                  href={`/admin/bookings/${b.id}`}
                  className={`absolute inset-x-0.5 overflow-hidden rounded border-l-4 p-1 text-[11px] leading-tight shadow-sm hover:z-10 hover:ring-2 hover:ring-brand-500 ${COLORS[b.status] ?? COLORS.CONFIRMED}`}
                  style={pos}
                  title={`${b.customerName} — ${b.title}`}
                >
                  <span className="block font-bold">{fmtTime(b.startsAt)} {b.customerName}</span>
                  <span className="block truncate">{b.pickupSuburb}</span>
                </Link>
              ) : null;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
