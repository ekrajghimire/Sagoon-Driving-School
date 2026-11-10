import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { todaySydney, addDays, sydneyDayRange, fmtDate, fmtTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { ALL_STAFF } from "../_lib/roles";
import { mondayOf, validIso } from "../_lib/dates";
import { PageHeader, EmptyState } from "../_components/PageHeader";
import { StatusBadge, SplitBadge, isSplit } from "../_components/StatusBadge";
import { WeekCalendar } from "./WeekCalendar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings" };

const STATUSES = [
  ["CONFIRMED", "Confirmed"],
  ["COMPLETED", "Completed"],
  ["NO_SHOW", "No-show"],
  ["CANCELLED", "Cancelled"],
] as const;
const PAYMENTS = [
  ["OWED", "Unpaid — lesson done"],
  ["UNPAID", "Unpaid (any)"],
  ["PAID", "Paid"],
  ["CREDIT", "Package credit"],
  ["FREE", "No charge"],
  ["REFUNDED", "Refunded"],
] as const;
const LIMIT = 300;

type SP = { view?: string; start?: string; from?: string; to?: string; status?: string; pay?: string; q?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireStaff(ALL_STAFF);
  const sp = await searchParams;
  const today = todaySydney();
  const view = sp.view === "week" ? "week" : "list";
  const canCreate = user.role !== "INSTRUCTOR";
  const newBtn = canCreate && (
    <Link href="/admin/bookings/new" className="btn-primary btn-sm">
      <Plus className="size-4" aria-hidden /> New booking
    </Link>
  );

  if (view === "week") {
    const monday = mondayOf(validIso(sp.start, today));
    const sunday = addDays(monday, 6);
    const start = sydneyDayRange(monday).start;
    const end = sydneyDayRange(sunday).end;
    const [bookings, blocked, holidays] = await Promise.all([
      prisma.booking.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start }, status: { not: "CANCELLED" } }, orderBy: { startsAt: "asc" } }),
      prisma.blockedTime.findMany({ where: { startsAt: { lt: end }, endsAt: { gt: start } }, orderBy: { startsAt: "asc" } }),
      prisma.publicHoliday.findMany({ where: { date: { gte: monday, lte: sunday } } }),
    ]);
    const isThisWeek = monday === mondayOf(today);
    return (
      <>
        <PageHeader title="Bookings" subtitle={`${fmtDate(start)} – ${fmtDate(sydneyDayRange(sunday).start)} · ${bookings.length} lesson${bookings.length === 1 ? "" : "s"}`}>
          <ViewToggle view="week" />
          {newBtn}
        </PageHeader>
        <div className="sticky top-[61px] z-20 -mx-4 mb-3 flex items-center gap-2 border-b border-line bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border lg:top-0">
          <Link className="btn-outline btn-sm" href={`/admin/bookings?view=week&start=${addDays(monday, -7)}`} aria-label="Previous week">
            <ChevronLeft className="size-4" aria-hidden /> <span className="hidden sm:inline">Previous</span>
          </Link>
          <Link className={`btn-sm ${isThisWeek ? "btn-brand" : "btn-outline"}`} href="/admin/bookings?view=week" aria-current={isThisWeek ? "page" : undefined}>
            This week
          </Link>
          <Link className="btn-outline btn-sm" href={`/admin/bookings?view=week&start=${addDays(monday, 7)}`} aria-label="Next week">
            <span className="hidden sm:inline">Next</span> <ChevronRight className="size-4" aria-hidden />
          </Link>
          <span className="ml-auto hidden text-xs text-muted md:inline">Striped grey = blocked time</span>
        </div>
        <WeekCalendar
          monday={monday}
          today={today}
          bookings={bookings}
          blocked={blocked}
          holidays={Object.fromEntries(holidays.map((h) => [h.date, h.name]))}
        />
      </>
    );
  }

  let from = validIso(sp.from, today);
  let to = validIso(sp.to, addDays(today, 14));
  if (from > to) [from, to] = [to, from];
  const status = STATUSES.find(([s]) => s === sp.status)?.[0];
  const pay = PAYMENTS.find(([p]) => p === sp.pay)?.[0];
  const q = (sp.q ?? "").trim().slice(0, 80);
  const where: Prisma.BookingWhereInput = {
    startsAt: { gte: sydneyDayRange(from).start, lt: sydneyDayRange(to).end },
    ...(status ? { status } : pay === "OWED" ? { status: { in: ["COMPLETED", "NO_SHOW"] } } : {}),
    ...(pay ? { paymentStatus: pay === "OWED" ? "UNPAID" : pay } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerEmail: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q.replace(/\s+/g, "") } },
            { customerPhone: { contains: q } },
            { ref: { contains: q.toUpperCase() } },
            { pickupSuburb: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const bookings = await prisma.booking.findMany({ where, orderBy: { startsAt: from >= today ? "asc" : "desc" }, take: LIMIT + 1 });
  const truncated = bookings.length > LIMIT;
  if (truncated) bookings.length = LIMIT;
  const filtered = Boolean(status || pay || q || sp.from || sp.to);

  const chips: [string, string, string][] = [
    ["Today", today, today],
    ["Next 7 days", today, addDays(today, 6)],
    ["Next 30 days", today, addDays(today, 29)],
    ["Last 7 days", addDays(today, -7), addDays(today, -1)],
    ["Last 30 days", addDays(today, -30), addDays(today, -1)],
  ];
  const chipHref = (f: string, t: string) => {
    const p = new URLSearchParams({ from: f, to: t });
    if (status) p.set("status", status);
    if (pay) p.set("pay", pay);
    if (q) p.set("q", q);
    return `/admin/bookings?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle={`${truncated ? `First ${LIMIT}` : bookings.length} booking${bookings.length === 1 ? "" : "s"} · ${fmtDate(sydneyDayRange(from).start)} – ${fmtDate(sydneyDayRange(to).start)}`}
      >
        <ViewToggle view="list" />
        {newBtn}
      </PageHeader>

      <nav aria-label="Date range shortcuts" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chips.map(([label, f, t]) => {
          const on = from === f && to === t;
          return (
            <Link
              key={label}
              href={chipHref(f, t)}
              aria-current={on ? "page" : undefined}
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-4 text-sm font-semibold transition hover:border-brand-500 aria-[current=page]:border-brand-700 aria-[current=page]:bg-brand-700 aria-[current=page]:text-white sm:min-h-9"
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <details className="group card mb-4 p-0" open={filtered || undefined}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4 text-muted" aria-hidden /> Filters &amp; search
          {filtered && <span className="badge bg-brand-100 text-brand-800">on</span>}
          <ChevronRight className="ml-auto size-4 text-muted transition group-open:rotate-90" aria-hidden />
        </summary>
        <form className="grid gap-3 border-t border-line p-4 sm:grid-cols-2 lg:grid-cols-6" method="get">
          <div className="lg:col-span-2">
            <label className="label" htmlFor="q">Search</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Name, phone, email, ref, suburb" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={from} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={to} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={status ?? ""} className="input">
              <option value="">All</option>
              {STATUSES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pay">Payment</label>
            <select id="pay" name="pay" defaultValue={pay ?? ""} className="input">
              <option value="">All</option>
              {PAYMENTS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
            <button className="btn-brand flex-1 sm:flex-none">Apply</button>
            <Link href="/admin/bookings" className="btn-ghost">Clear</Link>
          </div>
        </form>
      </details>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings match"
          action={filtered ? <Link href="/admin/bookings" className="btn-outline btn-sm">Clear filters</Link> : canCreate ? <Link href="/admin/bookings/new" className="btn-outline btn-sm">Add a booking</Link> : undefined}
        >
          Try a wider date range or a different search.
        </EmptyState>
      ) : (
        <>
          {/* Phone: stacked cards */}
          <ul className="grid gap-2 md:hidden">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.id}`} className={`card block p-4 transition hover:border-brand-500 active:bg-surface ${b.status === "CANCELLED" ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold tabular-nums">{fmtTime(b.startsAt)} <span className="font-semibold text-muted">· {fmtDate(b.startsAt)}</span></p>
                      <p className="truncate font-semibold text-brand-700">{b.customerName}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {b.title} · {durationLabel(b.durationMins)} · {b.pickupSuburb}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={b.paymentStatus} />
                    {isSplit(b) && <SplitBadge />}
                    <span className="ml-auto text-sm font-semibold tabular-nums">{aud(b.priceCents - b.discountCents)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
            <table className="table-x">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Lesson</th>
                  <th scope="col">Pickup</th>
                  <th scope="col" className="text-right">Price</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={`transition hover:bg-surface ${b.status === "CANCELLED" ? "text-muted" : ""}`}>
                    <td className="whitespace-nowrap">
                      <Link className="font-semibold text-brand-700 hover:underline" href={`/admin/bookings/${b.id}`}>
                        {fmtDate(b.startsAt)}
                        <span className="block tabular-nums">{fmtTime(b.startsAt)}</span>
                      </Link>
                    </td>
                    <td>
                      {b.customerName}
                      <span className="block text-xs text-muted">{b.customerPhone}</span>
                    </td>
                    <td>
                      {b.title}
                      <span className="block text-xs text-muted">
                        {durationLabel(b.durationMins)} · <span className="font-mono">{b.ref}</span>
                      </span>
                      {isSplit(b) && <SplitBadge />}
                    </td>
                    <td>{b.pickupSuburb}</td>
                    <td className="text-right tabular-nums">{aud(b.priceCents - b.discountCents)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={b.status} />
                        <StatusBadge status={b.paymentStatus} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {truncated && <p className="mt-3 text-sm text-muted">Showing the first {LIMIT}. Narrow the dates or search to see the rest.</p>}
        </>
      )}
    </>
  );
}

function ViewToggle({ view }: { view: "list" | "week" }) {
  const cls =
    "inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold transition hover:bg-surface aria-[current=page]:bg-brand-700 aria-[current=page]:text-white max-lg:min-h-10";
  return (
    <div className="inline-flex rounded-xl border border-line bg-white p-0.5" role="group" aria-label="View">
      <Link href="/admin/bookings" aria-current={view === "list" ? "page" : undefined} className={cls}>
        List
      </Link>
      <Link href="/admin/bookings?view=week" aria-current={view === "week" ? "page" : undefined} className={cls}>
        Week
      </Link>
    </div>
  );
}
