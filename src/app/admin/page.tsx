import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { calendarConfigured } from "@/lib/google-calendar";
import { todaySydney, addDays, sydneyDayRange, sydneyToUtc, fmtDate } from "@/lib/time";
import { aud } from "@/lib/money";
import { ALL_STAFF } from "./_lib/roles";
import { weekRange } from "./_lib/dates";
import { PageHeader, Kpi } from "./_components/PageHeader";
import { LessonCard } from "./_components/LessonCard";
import { RetryAllButton } from "./_components/RetryAllButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

export default async function AdminToday() {
  const user = await requireStaff(ALL_STAFF);
  const isAdmin = user.role !== "INSTRUCTOR";
  const today = todaySydney();
  const tomorrow = addDays(today, 1);
  const todayR = sydneyDayRange(today);
  const tomorrowR = sydneyDayRange(tomorrow);
  const week = weekRange(today);
  const monthStart = sydneyToUtc(`${today.slice(0, 8)}01`, 0);
  const active = { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] as ("CONFIRMED" | "COMPLETED" | "NO_SHOW")[] };

  const [lessons, weekAgg, paidBookings, paidPurchases, unpaid, pendingPurchases, failedSyncs, newMessages, waitlist] = await Promise.all([
    prisma.booking.findMany({ where: { startsAt: { gte: todayR.start, lt: tomorrowR.end }, status: active }, orderBy: { startsAt: "asc" } }),
    prisma.booking.aggregate({ where: { startsAt: { gte: week.start, lt: week.end }, status: { in: ["CONFIRMED", "COMPLETED"] } }, _count: true, _sum: { durationMins: true } }),
    prisma.booking.findMany({ where: { paymentStatus: "PAID", paidAt: { gte: monthStart } }, select: { priceCents: true, discountCents: true } }),
    prisma.packagePurchase.findMany({ where: { status: "PAID", paidAt: { gte: monthStart } }, select: { priceCents: true, discountCents: true } }),
    prisma.booking.findMany({ where: { paymentStatus: "UNPAID", status: { in: ["COMPLETED", "NO_SHOW"] } }, select: { priceCents: true, discountCents: true } }),
    prisma.packagePurchase.findMany({ where: { status: "PENDING_PAYMENT" }, select: { priceCents: true, discountCents: true } }),
    prisma.booking.count({ where: { calendarSync: "FAILED" } }),
    prisma.contactMessage.count({ where: { handled: false } }),
    prisma.waitlistEntry.count({ where: { date: { gte: today }, notifiedAt: null } }),
  ]);

  const sum = (rows: { priceCents: number; discountCents: number }[]) => rows.reduce((n, r) => n + r.priceCents - r.discountCents, 0);
  const revenue = sum(paidBookings) + sum(paidPurchases);
  const owed = sum(unpaid) + sum(pendingPurchases);
  const todays = lessons.filter((l) => l.startsAt < todayR.end);
  const tomorrows = lessons.filter((l) => l.startsAt >= tomorrowR.start);
  const gcal = calendarConfigured();

  return (
    <>
      <PageHeader title={`G'day, ${user.name.split(" ")[0]}`} subtitle={fmtDate(new Date())}>
        {isAdmin && <Link href="/admin/bookings/new" className="btn-primary btn-sm">+ New booking</Link>}
        <Link href="/admin/bookings?view=week" className="btn-outline btn-sm">Week view</Link>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Lessons this week" value={weekAgg._count} />
        <Kpi label="Hours booked this week" value={((weekAgg._sum.durationMins ?? 0) / 60).toFixed(1)} />
        {isAdmin && <Kpi label="Revenue this month" value={aud(revenue, { round: true })} hint="Paid lessons + paid packages" tone="ok" />}
        {isAdmin && <Kpi label="Unpaid balances" value={aud(owed, { round: true })} hint={`${unpaid.length} lessons · ${pendingPurchases.length} packages`} tone={owed ? "warn" : undefined} />}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Google Calendar</p>
            <p className={`font-bold ${!gcal ? "text-amber-700" : failedSyncs ? "text-danger" : "text-ok"}`}>
              {!gcal ? "Not connected" : failedSyncs ? `${failedSyncs} sync failure${failedSyncs > 1 ? "s" : ""}` : "Connected & in sync"}
            </p>
          </div>
          {gcal && failedSyncs > 0 && <RetryAllButton />}
        </div>
        {isAdmin && (
          <Link href="/admin/inbox" className="card p-4 hover:border-brand-500">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">New messages</p>
            <p className="font-bold">{newMessages} unread enquiries</p>
          </Link>
        )}
        {isAdmin && (
          <Link href="/admin/inbox#waitlist" className="card p-4 hover:border-brand-500">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Waitlist</p>
            <p className="font-bold">{waitlist} waiting for a spot</p>
          </Link>
        )}
      </div>

      <section className="mt-8" aria-labelledby="today-h">
        <h2 id="today-h" className="text-xl font-extrabold">Today · {todays.length} lesson{todays.length === 1 ? "" : "s"}</h2>
        <div className="mt-3 grid gap-3">
          {todays.length ? todays.map((b) => <LessonCard key={b.id} b={b} />) : <p className="rounded-xl bg-surface p-4 text-sm text-muted">No lessons today.</p>}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="tom-h">
        <h2 id="tom-h" className="text-xl font-extrabold">Tomorrow · {tomorrows.length} lesson{tomorrows.length === 1 ? "" : "s"}</h2>
        <div className="mt-3 grid gap-3">
          {tomorrows.length ? tomorrows.map((b) => <LessonCard key={b.id} b={b} />) : <p className="rounded-xl bg-surface p-4 text-sm text-muted">No lessons tomorrow.</p>}
        </div>
      </section>
    </>
  );
}
