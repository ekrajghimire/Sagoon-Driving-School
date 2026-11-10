import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { todaySydney, addDays, sydneyDayRange, fmtDate, fmtTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { ALL_STAFF } from "../_lib/roles";
import { mondayOf, validIso } from "../_lib/dates";
import { PageHeader } from "../_components/PageHeader";
import { StatusBadge } from "../_components/StatusBadge";
import { WeekCalendar } from "./WeekCalendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

const STATUSES = ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;
type SP = { view?: string; start?: string; from?: string; to?: string; status?: string; q?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaff(ALL_STAFF);
  const sp = await searchParams;
  const today = todaySydney();
  const view = sp.view === "week" ? "week" : "list";

  if (view === "week") {
    const monday = mondayOf(validIso(sp.start, today));
    const start = sydneyDayRange(monday).start;
    const end = sydneyDayRange(addDays(monday, 6)).end;
    const [bookings, blocked, holidays] = await Promise.all([
      prisma.booking.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "asc" } }),
      prisma.blockedTime.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start } } }),
      prisma.publicHoliday.findMany({ where: { date: { gte: monday, lte: addDays(monday, 6) } } }),
    ]);
    return (
      <>
        <PageHeader title="Bookings" subtitle={`Week of ${fmtDate(start)}`}>
          <ViewToggle view="week" />
          {user.role !== "INSTRUCTOR" && <Link href="/admin/bookings/new" className="btn-primary btn-sm">+ New booking</Link>}
        </PageHeader>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Link className="btn-outline btn-sm" href={`/admin/bookings?view=week&start=${addDays(monday, -7)}`}>← Previous</Link>
          <Link className="btn-outline btn-sm" href="/admin/bookings?view=week">This week</Link>
          <Link className="btn-outline btn-sm" href={`/admin/bookings?view=week&start=${addDays(monday, 7)}`}>Next →</Link>
          <span className="ml-auto text-sm text-muted">{bookings.length} lessons · grey = blocked time</span>
        </div>
        <WeekCalendar monday={monday} bookings={bookings} blocked={blocked} holidays={Object.fromEntries(holidays.map((h) => [h.date, h.name]))} />
      </>
    );
  }

  const from = validIso(sp.from, today);
  const to = validIso(sp.to, addDays(today, 14));
  const status = STATUSES.find((s) => s === sp.status);
  const q = (sp.q ?? "").trim().slice(0, 80);
  const where: Prisma.BookingWhereInput = {
    startsAt: { gte: sydneyDayRange(from).start, lt: sydneyDayRange(to).end },
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q } },
            { ref: { contains: q.toUpperCase() } },
          ],
        }
      : {}),
  };
  const bookings = await prisma.booking.findMany({ where, orderBy: { startsAt: "asc" }, take: 300 });

  return (
    <>
      <PageHeader title="Bookings" subtitle={`${bookings.length} booking${bookings.length === 1 ? "" : "s"} ${fmtDate(sydneyDayRange(from).start)} – ${fmtDate(sydneyDayRange(to).start)}`}>
        <ViewToggle view="list" />
        {user.role !== "INSTRUCTOR" && <Link href="/admin/bookings/new" className="btn-primary btn-sm">+ New booking</Link>}
      </PageHeader>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" method="get">
        <div><label className="label" htmlFor="from">From</label><input id="from" name="from" type="date" defaultValue={from} className="input" /></div>
        <div><label className="label" htmlFor="to">To</label><input id="to" name="to" type="date" defaultValue={to} className="input" /></div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", "-").toLowerCase()}</option>)}
          </select>
        </div>
        <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} placeholder="Name, email, phone, ref" className="input" /></div>
        <div className="flex items-end gap-2"><button className="btn-brand">Filter</button><Link href="/admin/bookings" className="btn-ghost">Reset</Link></div>
      </form>

      {/* Mobile cards */}
      <ul className="grid gap-2 md:hidden">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="card block p-4 hover:border-brand-500">
              <div className="flex justify-between gap-2">
                <p className="font-bold">{fmtDate(b.startsAt)} · {fmtTime(b.startsAt)}</p>
                <StatusBadge status={b.status} />
              </div>
              <p className="text-sm">{b.customerName} · {b.title}</p>
              <p className="text-xs text-muted">{b.pickupSuburb} · {b.ref}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line md:block">
        <table className="table-x">
          <thead className="bg-surface">
            <tr><th>When</th><th>Customer</th><th>Lesson</th><th>Pickup</th><th>Price</th><th>Status</th><th>Payment</th></tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-surface">
                <td><Link className="font-semibold text-brand-700 hover:underline" href={`/admin/bookings/${b.id}`}>{fmtDate(b.startsAt)}<br />{fmtTime(b.startsAt)}</Link></td>
                <td>{b.customerName}<br /><span className="text-xs text-muted">{b.customerPhone}</span></td>
                <td>{b.title}<br /><span className="text-xs text-muted">{durationLabel(b.durationMins)} · {b.ref}</span></td>
                <td>{b.pickupSuburb}</td>
                <td>{aud(b.priceCents - b.discountCents)}</td>
                <td><StatusBadge status={b.status} /></td>
                <td><StatusBadge status={b.paymentStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!bookings.length && <p className="mt-4 rounded-xl bg-surface p-4 text-sm text-muted">No bookings match these filters.</p>}
    </>
  );
}

function ViewToggle({ view }: { view: "list" | "week" }) {
  return (
    <div className="inline-flex rounded-xl border border-line p-0.5" role="group" aria-label="View">
      <Link href="/admin/bookings" aria-current={view === "list" ? "page" : undefined} className="rounded-lg px-3 py-1.5 text-sm font-semibold aria-[current=page]:bg-brand-700 aria-[current=page]:text-white">List</Link>
      <Link href="/admin/bookings?view=week" aria-current={view === "week" ? "page" : undefined} className="rounded-lg px-3 py-1.5 text-sm font-semibold aria-[current=page]:bg-brand-700 aria-[current=page]:text-white">Week</Link>
    </div>
  );
}
