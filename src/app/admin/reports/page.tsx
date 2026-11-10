import Link from "next/link";
import { prisma, getInstructor } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { todaySydney, addDays, sydneyDayRange, fmtSydney, weekdayOf, fmtDate } from "@/lib/time";
import { aud, gstOf } from "@/lib/money";
import { ADMINS } from "../_lib/roles";
import { mondayOf, validIso } from "../_lib/dates";
import { PageHeader, Kpi } from "../_components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

type Group = "day" | "week" | "month";
const dayKey = (d: Date) => fmtSydney(d, "yyyy-MM-dd");
const keyOf = (day: string, g: Group) => (g === "day" ? day : g === "week" ? mondayOf(day) : day.slice(0, 7));
const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

function Bar({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 flex-1 rounded-full bg-surface" aria-hidden>
        <div className="h-3 rounded-full bg-brand-500" style={{ width: `${max && value > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right text-xs font-semibold">{label}</span>
    </div>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; group?: string }> }) {
  await requireStaff(ADMINS);
  const sp = await searchParams;
  const today = todaySydney();
  let to = validIso(sp.to, today);
  let from = validIso(sp.from, addDays(to, -29));
  if (from > to) [from, to] = [to, from];
  if (addDays(from, 366) < to) from = addDays(to, -366);
  const group: Group = sp.group === "week" || sp.group === "month" ? sp.group : "day";
  const start = sydneyDayRange(from).start;
  const end = sydneyDayRange(to).end;
  const instructor = await getInstructor();

  const [paidBookings, paidPurchases, bookings, purchases, hours, holidays] = await Promise.all([
    prisma.booking.findMany({ where: { paymentStatus: "PAID", paidAt: { gte: start, lt: end } }, select: { paidAt: true, priceCents: true, discountCents: true } }),
    prisma.packagePurchase.findMany({ where: { status: "PAID", paidAt: { gte: start, lt: end } }, select: { paidAt: true, priceCents: true, discountCents: true } }),
    prisma.booking.findMany({ where: { startsAt: { gte: start, lt: end } }, select: { startsAt: true, status: true, durationMins: true, title: true, paymentStatus: true } }),
    prisma.packagePurchase.findMany({ where: { createdAt: { gte: start, lt: end }, status: { not: "CANCELLED" } }, include: { package: { select: { name: true } } } }),
    prisma.workingHours.findMany({ where: { instructorId: instructor.id } }),
    prisma.publicHoliday.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  // Buckets for every period in range (so empty periods still show).
  const keys: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const k = keyOf(d, group);
    if (keys.at(-1) !== k) keys.push(k);
  }
  type Row = { revenue: number; bookings: number; minutesTaught: number; cancelled: number; noShow: number };
  const rows = new Map<string, Row>(keys.map((k) => [k, { revenue: 0, bookings: 0, minutesTaught: 0, cancelled: 0, noShow: 0 }]));
  const row = (d: Date) => rows.get(keyOf(dayKey(d), group));

  for (const p of [...paidBookings, ...paidPurchases]) {
    const r = p.paidAt && row(p.paidAt);
    if (r) r.revenue += p.priceCents - p.discountCents;
  }
  for (const b of bookings) {
    const r = row(b.startsAt);
    if (!r) continue;
    if (b.status === "CANCELLED") r.cancelled++;
    else if (b.status === "NO_SHOW") r.noShow++;
    else r.bookings++;
    if (b.status === "COMPLETED") r.minutesTaught += b.durationMins;
  }

  const totals = [...rows.values()].reduce(
    (t, r) => ({ revenue: t.revenue + r.revenue, bookings: t.bookings + r.bookings, minutesTaught: t.minutesTaught + r.minutesTaught, cancelled: t.cancelled + r.cancelled, noShow: t.noShow + r.noShow }),
    { revenue: 0, bookings: 0, minutesTaught: 0, cancelled: 0, noShow: 0 },
  );
  const allBookings = totals.bookings + totals.cancelled + totals.noShow;
  const maxRevenue = Math.max(0, ...[...rows.values()].map((r) => r.revenue));

  // Utilisation: booked minutes ÷ available working minutes (holidays excluded).
  const holidaySet = new Set(holidays.map((h) => h.date));
  let workMinutes = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (holidaySet.has(d)) continue;
    const wd = weekdayOf(d);
    workMinutes += hours.filter((h) => h.weekday === wd).reduce((n, h) => n + h.endMin - h.startMin, 0);
  }
  const bookedMinutes = bookings.filter((b) => b.status === "CONFIRMED" || b.status === "COMPLETED").reduce((n, b) => n + b.durationMins, 0);

  const lessonPop = new Map<string, number>();
  for (const b of bookings) if (b.status !== "CANCELLED") lessonPop.set(b.title, (lessonPop.get(b.title) ?? 0) + 1);
  const lessonTop = [...lessonPop.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const pkgPop = new Map<string, { n: number; cents: number }>();
  for (const p of purchases) {
    const e = pkgPop.get(p.package.name) ?? { n: 0, cents: 0 };
    e.n++;
    e.cents += p.priceCents - p.discountCents;
    pkgPop.set(p.package.name, e);
  }
  const pkgTop = [...pkgPop.entries()].sort((a, b) => b[1].n - a[1].n);

  const label = (k: string) => (group === "month" ? new Date(`${k}-01T12:00:00Z`).toLocaleDateString("en-AU", { month: "short", year: "numeric", timeZone: "UTC" }) : group === "week" ? `Week of ${fmtDate(sydneyDayRange(k).start)}` : fmtDate(sydneyDayRange(k).start));
  const presets: [string, string, string][] = [
    ["Last 7 days", addDays(today, -6), today],
    ["Last 30 days", addDays(today, -29), today],
    ["This month", `${today.slice(0, 8)}01`, today],
    ["Last 12 months", addDays(today, -364), today],
    ["Next 30 days", today, addDays(today, 29)],
  ];

  return (
    <>
      <PageHeader title="Reports" subtitle={`${fmtDate(start)} – ${fmtDate(sydneyDayRange(to).start)}`} />
      <nav aria-label="Report presets" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {presets.map(([l, f, t]) => {
          const g = l.includes("12") ? "month" : group;
          const on = from === f && to === t;
          return (
            <Link
              key={l}
              href={`?from=${f}&to=${t}&group=${g}`}
              aria-current={on ? "page" : undefined}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-4 text-sm font-semibold transition hover:border-brand-500 aria-[current=page]:border-brand-700 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white sm:min-h-9"
            >
              {l}
            </Link>
          );
        })}
      </nav>
      <form method="get" className="card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <label className="label">From<input type="date" name="from" defaultValue={from} className="input mt-1" /></label>
        <label className="label">To<input type="date" name="to" defaultValue={to} className="input mt-1" /></label>
        <label className="label">Group by
          <select name="group" defaultValue={group} className="input mt-1"><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select>
        </label>
        <div className="flex items-end"><button className="btn-brand w-full sm:w-auto">Update</button></div>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Revenue received" value={aud(totals.revenue, { round: true })} hint={`incl. ${aud(gstOf(totals.revenue))} GST`} tone="ok" />
        <Kpi label="Lessons (excl. cancelled)" value={totals.bookings} hint={`${(totals.minutesTaught / 60).toFixed(1)} hrs taught (completed)`} />
        <Kpi label="Cancellations" value={totals.cancelled} hint={`${pct(totals.cancelled, allBookings)} of bookings`} tone={totals.cancelled ? "warn" : undefined} />
        <Kpi label="No-shows" value={totals.noShow} hint={`${pct(totals.noShow, allBookings)} of bookings`} tone={totals.noShow ? "bad" : undefined} />
      </div>

      <section className="card mt-4" aria-labelledby="util-h">
        <h2 id="util-h" className="font-bold">Instructor utilisation</h2>
        <p className="text-sm text-muted">Booked time ÷ working hours in this period (public holidays excluded).</p>
        <p className="mt-2 text-3xl font-extrabold">{pct(bookedMinutes, workMinutes)}</p>
        <Bar value={bookedMinutes} max={workMinutes} label={`${(bookedMinutes / 60).toFixed(1)} / ${(workMinutes / 60).toFixed(0)} hrs`} />
      </section>

      <section className="card mt-4" aria-labelledby="per-h">
        <h2 id="per-h" className="font-bold">By {group}</h2>
        {/* Phone: one compact row per period */}
        <ul className="mt-3 divide-y divide-line md:hidden">
          {keys.map((k) => {
            const r = rows.get(k)!;
            return (
              <li key={k} className="py-2.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold">{label(k)}</span>
                  <span className="font-bold tabular-nums">{aud(r.revenue, { round: true })}</span>
                </div>
                <Bar value={r.revenue} max={maxRevenue} label={`${r.bookings} lesson${r.bookings === 1 ? "" : "s"}`} />
                {(r.cancelled > 0 || r.noShow > 0 || r.minutesTaught > 0) && (
                  <p className="mt-0.5 text-xs text-muted">
                    {(r.minutesTaught / 60).toFixed(1)} hrs taught{r.cancelled ? ` · ${r.cancelled} cancelled` : ""}
                    {r.noShow ? ` · ${r.noShow} no-show` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="table-x min-w-[640px]">
            <caption className="sr-only">Revenue and bookings by {group}</caption>
            <thead><tr><th scope="col">Period</th><th scope="col" className="w-1/3">Revenue</th><th scope="col">GST</th><th scope="col">Lessons</th><th scope="col">Hours taught</th><th scope="col">Cancelled</th><th scope="col">No-show</th></tr></thead>
            <tbody>
              {keys.map((k) => {
                const r = rows.get(k)!;
                return (
                  <tr key={k}>
                    <th scope="row" className="px-3 py-2 text-left font-semibold">{label(k)}</th>
                    <td><Bar value={r.revenue} max={maxRevenue} label={aud(r.revenue, { round: true })} /></td>
                    <td>{aud(gstOf(r.revenue))}</td>
                    <td>{r.bookings}</td>
                    <td>{(r.minutesTaught / 60).toFixed(1)}</td>
                    <td>{r.cancelled}</td>
                    <td>{r.noShow}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="pop-h">
          <h2 id="pop-h" className="font-bold">Popular lessons</h2>
          <ul className="mt-3 space-y-2">
            {lessonTop.map(([name, n]) => (
              <li key={name} className="text-sm"><p>{name}</p><Bar value={n} max={lessonTop[0]?.[1] ?? 1} label={`${n} booking${n === 1 ? "" : "s"}`} /></li>
            ))}
            {!lessonTop.length && <li className="text-sm text-muted">No bookings in this period.</li>}
          </ul>
        </section>
        <section className="card" aria-labelledby="pkg-h">
          <h2 id="pkg-h" className="font-bold">Packages sold</h2>
          <ul className="mt-3 space-y-2">
            {pkgTop.map(([name, e]) => (
              <li key={name} className="text-sm"><p>{name} · {aud(e.cents, { round: true })}</p><Bar value={e.n} max={pkgTop[0]?.[1].n ?? 1} label={`${e.n} sold`} /></li>
            ))}
            {!pkgTop.length && <li className="text-sm text-muted">No package purchases in this period.</li>}
          </ul>
        </section>
      </div>
      <p className="mt-4 text-xs text-muted">Revenue counts lessons and packages when they are marked paid (by payment date). Package-credit lessons are counted when the package is paid. Not accounting advice — confirm figures with your accountant/BAS agent.</p>
    </>
  );
}
