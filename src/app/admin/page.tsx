import Link from "next/link";
import { Plus, CalendarDays, CircleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { calendarConfigured } from "@/lib/google-calendar";
import { todaySydney, addDays, sydneyDayRange, sydneyToUtc, fmtDate, fmtTime } from "@/lib/time";
import { aud } from "@/lib/money";
import { ALL_STAFF } from "./_lib/roles";
import { weekRange } from "./_lib/dates";
import { PageHeader, Kpi, EmptyState, SectionTitle } from "./_components/PageHeader";
import { LessonCard } from "./_components/LessonCard";
import { RetryAllButton } from "./_components/RetryAllButton";
import { LessonQuickActions } from "./_components/LessonQuickActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };

export default async function AdminToday() {
  const user = await requireStaff(ALL_STAFF);
  const isAdmin = user.role !== "INSTRUCTOR";
  const now = new Date();
  const today = todaySydney(now);
  const tomorrow = addDays(today, 1);
  const todayR = sydneyDayRange(today);
  const tomorrowR = sydneyDayRange(tomorrow);
  const week = weekRange(today);
  const monthStart = sydneyToUtc(`${today.slice(0, 8)}01`, 0);
  const active = { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] as ("CONFIRMED" | "COMPLETED" | "NO_SHOW")[] };

  const [lessons, followUp, weekAgg, paidBookings, paidPurchases, unpaid, pendingPurchases, failedSyncs, newMessages, waitlist] = await Promise.all([
    prisma.booking.findMany({ where: { startsAt: { gte: todayR.start, lt: tomorrowR.end }, status: active }, orderBy: { startsAt: "asc" } }),
    // Lessons from the last fortnight that finished but were never marked complete / no-show.
    prisma.booking.findMany({
      where: { status: "CONFIRMED", endsAt: { lte: todayR.start, gte: sydneyDayRange(addDays(today, -14)).start } },
      orderBy: { startsAt: "desc" },
      take: 20,
      select: { id: true, customerName: true, startsAt: true, title: true, status: true },
    }),
    prisma.booking.aggregate({ where: { startsAt: { gte: week.start, lt: week.end }, status: { in: ["CONFIRMED", "COMPLETED"] } }, _count: true, _sum: { durationMins: true } }),
    isAdmin ? prisma.booking.aggregate({ where: { paymentStatus: "PAID", paidAt: { gte: monthStart } }, _sum: { priceCents: true, discountCents: true } }) : null,
    isAdmin ? prisma.packagePurchase.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { priceCents: true, discountCents: true } }) : null,
    isAdmin
      ? prisma.booking.aggregate({ where: { paymentStatus: "UNPAID", status: { in: ["COMPLETED", "NO_SHOW"] } }, _count: true, _sum: { priceCents: true, discountCents: true } })
      : null,
    isAdmin ? prisma.packagePurchase.aggregate({ where: { status: "PENDING_PAYMENT" }, _count: true, _sum: { priceCents: true, discountCents: true } }) : null,
    prisma.booking.count({ where: { calendarSync: "FAILED" } }),
    isAdmin ? prisma.contactMessage.count({ where: { handled: false } }) : 0,
    isAdmin ? prisma.waitlistEntry.count({ where: { date: { gte: today }, notifiedAt: null } }) : 0,
  ]);

  const net = (a: { _sum: { priceCents: number | null; discountCents: number | null } } | null) => (a ? (a._sum.priceCents ?? 0) - (a._sum.discountCents ?? 0) : 0);
  const revenue = net(paidBookings) + net(paidPurchases);
  const owed = net(unpaid) + net(pendingPurchases);
  const todays = lessons.filter((l) => l.startsAt < todayR.end);
  const tomorrows = lessons.filter((l) => l.startsAt >= tomorrowR.start);
  const upNext = todays.find((l) => l.status === "CONFIRMED" && l.endsAt > now);
  const gcal = calendarConfigured();
  const hoursToday = todays.reduce((n, l) => n + l.durationMins, 0) / 60;

  return (
    <>
      <PageHeader title={`G'day, ${user.name.split(" ")[0]}`} subtitle={fmtDate(now)}>
        {isAdmin && (
          <Link href="/admin/bookings/new" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden /> New booking
          </Link>
        )}
        <Link href="/admin/bookings?view=week" className="btn-outline btn-sm">
          <CalendarDays className="size-4" aria-hidden /> Week
        </Link>
      </PageHeader>

      {followUp.length > 0 && (
        <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4" aria-labelledby="fu-h">
          <h2 id="fu-h" className="flex items-center gap-2 font-extrabold text-amber-900">
            <CircleAlert className="size-5" aria-hidden /> {followUp.length} past lesson{followUp.length === 1 ? "" : "s"} still marked “confirmed”
          </h2>
          <p className="text-sm text-amber-900/80">Mark them complete (or no-show) so reports and unpaid balances stay accurate.</p>
          <ul className="mt-3 divide-y divide-amber-200">
            {followUp.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/admin/bookings/${b.id}`} className="min-w-0 font-semibold text-brand-800 hover:underline">
                  {b.customerName}
                  <span className="block text-xs font-normal text-muted">
                    {fmtDate(b.startsAt)} · {fmtTime(b.startsAt)} · {b.title}
                  </span>
                </Link>
                <LessonQuickActions id={b.id} status={b.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="today-h">
        <SectionTitle id="today-h" aside={todays.length > 0 && <span className="text-sm text-muted">{hoursToday.toFixed(1)} hrs</span>}>
          Today · {todays.length} lesson{todays.length === 1 ? "" : "s"}
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {todays.length ? (
            todays.map((b) => <LessonCard key={b.id} b={b} flag={b.id === upNext?.id ? (b.startsAt <= now ? "In progress" : "Up next") : undefined} />)
          ) : (
            <div className="md:col-span-2">
              <EmptyState title="No lessons today" action={isAdmin ? <Link href="/admin/bookings/new" className="btn-outline btn-sm">Add a booking</Link> : undefined}>
                Enjoy the break — or block the time off in Availability if you&apos;re not working.
              </EmptyState>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="tom-h">
        <SectionTitle id="tom-h">
          Tomorrow · {tomorrows.length} lesson{tomorrows.length === 1 ? "" : "s"}
        </SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          {tomorrows.length ? (
            tomorrows.map((b) => <LessonCard key={b.id} b={b} />)
          ) : (
            <div className="md:col-span-2">
              <EmptyState title="Nothing booked tomorrow yet" />
            </div>
          )}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="glance-h">
        <h2 id="glance-h" className="sr-only">At a glance</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Lessons this week" value={weekAgg._count} href="/admin/bookings?view=week" />
          <Kpi label="Hours this week" value={((weekAgg._sum.durationMins ?? 0) / 60).toFixed(1)} />
          {isAdmin && <Kpi label="Revenue this month" value={aud(revenue, { round: true })} hint="Paid lessons + packages" tone="ok" href={`/admin/reports?from=${today.slice(0, 8)}01&to=${today}`} />}
          {isAdmin && (
            <Kpi
              label="Unpaid balances"
              value={aud(owed, { round: true })}
              hint={`${unpaid?._count ?? 0} lessons · ${pendingPurchases?._count ?? 0} packages`}
              tone={owed ? "warn" : undefined}
              href="/admin/bookings?pay=OWED&from=2020-01-01&to=2099-12-31"
            />
          )}
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
            <Link href="/admin/inbox" className="card p-4 transition hover:border-brand-500 active:bg-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Messages</p>
              <p className={`font-bold ${newMessages ? "text-brand-700" : ""}`}>{newMessages ? `${newMessages} new enquir${newMessages === 1 ? "y" : "ies"}` : "All caught up"}</p>
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin/inbox#waitlist" className="card p-4 transition hover:border-brand-500 active:bg-surface">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Waitlist</p>
              <p className="font-bold">{waitlist} waiting for a spot</p>
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
