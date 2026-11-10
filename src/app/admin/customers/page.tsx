import Link from "next/link";
import { Download, Search, ChevronRight } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader, EmptyState, SectionTitle } from "../_components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };
const PER_PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff(ADMINS);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const qDigits = q.replace(/\s+/g, "");
  const requested = Math.max(1, Math.floor(Number(sp.page)) || 1);
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: qDigits } }] } : {}),
  };
  const guestWhere: Prisma.BookingWhereInput = {
    userId: null,
    ...(q
      ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: qDigits } }] }
      : {}),
  };
  const total = await prisma.user.count({ where });
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(requested, pages);
  const now = new Date();
  const [users, guests, guestCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        purchases: { where: { status: { in: ["PAID", "PENDING_PAYMENT"] } }, select: { creditsTotal: true, creditsUsed: true } },
        // Only what's needed: count + last past lesson + next upcoming lesson (not every booking row).
        _count: { select: { bookings: { where: { status: { in: ["CONFIRMED", "COMPLETED"] } } } } },
        bookings: {
          where: { status: { in: ["CONFIRMED", "COMPLETED"] }, startsAt: { lte: now } },
          select: { startsAt: true },
          orderBy: { startsAt: "desc" },
          take: 1,
        },
      },
    }),
    // Guests are grouped by email AND phone so phone-only guests (no email) aren't merged into one row.
    prisma.booking.findMany({
      where: guestWhere,
      distinct: ["customerEmail", "customerPhone"],
      orderBy: { startsAt: "desc" },
      take: 30,
      select: { customerEmail: true, customerName: true, customerPhone: true, startsAt: true },
    }),
    prisma.booking.groupBy({ by: ["customerEmail", "customerPhone"], where: guestWhere, _count: { _all: true } }),
  ]);
  const nextLessons = users.length
    ? await prisma.booking.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, status: "CONFIRMED", startsAt: { gt: now } },
        _min: { startsAt: true },
      })
    : [];
  const nextBy = new Map(nextLessons.map((n) => [n.userId, n._min.startsAt]));
  const gc = new Map(guestCounts.map((g) => [`${g.customerEmail}|${g.customerPhone}`, g._count._all]));
  const pageHref = (n: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`;

  return (
    <>
      <PageHeader title="Customers" subtitle={`${total} registered customer${total === 1 ? "" : "s"}${q ? ` matching “${q}”` : ""}`}>
        {/* Plain link: this is a CSV download route handler, not a page. */}
        <a href="/admin/customers/export" className="btn-outline btn-sm" download>
          <Download className="size-4" aria-hidden /> Export CSV
        </a>
      </PageHeader>

      <form method="get" className="mb-4 flex gap-2" role="search">
        <label htmlFor="q" className="sr-only">Search customers</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="q" name="q" type="search" defaultValue={q} className="input pl-9" placeholder="Name, email or phone" />
        </div>
        <button className="btn-brand">Search</button>
        {q && <Link href="/admin/customers" className="btn-ghost">Clear</Link>}
      </form>

      {users.length === 0 ? (
        <EmptyState title={q ? "No registered customers match" : "No registered customers yet"}>
          {q ? "Check the spelling, or look under guest bookers below." : "Customers appear here once they create an account on the website."}
        </EmptyState>
      ) : (
        <>
          {/* Phone: cards */}
          <ul className="grid gap-2 md:hidden">
            {users.map((u) => {
              const credits = u.purchases.reduce((n, p) => n + p.creditsTotal - p.creditsUsed, 0);
              const next = nextBy.get(u.id);
              return (
                <li key={u.id}>
                  <Link href={`/admin/customers/${u.id}`} className="card flex items-center gap-3 p-4 transition hover:border-brand-500 active:bg-surface">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-brand-700">{u.name}</p>
                      <p className="truncate text-sm text-muted">{u.phone ?? u.email}</p>
                      <p className="mt-1 text-xs text-muted">
                        {u._count.bookings} lesson{u._count.bookings === 1 ? "" : "s"}
                        {next ? ` · next ${fmtDate(next)}` : ""}
                      </p>
                    </div>
                    {credits > 0 && <span className="badge bg-brand-100 text-brand-800">{credits} credit{credits === 1 ? "" : "s"}</span>}
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
            <table className="table-x">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Contact</th>
                  <th scope="col" className="text-right">Lessons</th>
                  <th scope="col" className="text-right">Credits</th>
                  <th scope="col">Last lesson</th>
                  <th scope="col">Next lesson</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const next = nextBy.get(u.id);
                  return (
                    <tr key={u.id} className="transition hover:bg-surface">
                      <td>
                        <Link href={`/admin/customers/${u.id}`} className="font-semibold text-brand-700 hover:underline">
                          {u.name}
                        </Link>
                      </td>
                      <td>
                        <span className="break-all">{u.email}</span>
                        <span className="block text-xs text-muted">{u.phone ?? "—"}</span>
                      </td>
                      <td className="text-right tabular-nums">{u._count.bookings}</td>
                      <td className="text-right tabular-nums">{u.purchases.reduce((n, p) => n + p.creditsTotal - p.creditsUsed, 0)}</td>
                      <td>{u.bookings[0] ? fmtDate(u.bookings[0].startsAt) : "—"}</td>
                      <td>{next ? fmtDate(next) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      {pages > 1 && (
        <nav className="mt-3 flex items-center justify-between gap-2 sm:justify-start" aria-label="Pagination">
          {page > 1 ? <Link className="btn-outline btn-sm" href={pageHref(page - 1)}>← Prev</Link> : <span />}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link className="btn-outline btn-sm" href={pageHref(page + 1)}>Next →</Link> : <span />}
        </nav>
      )}

      <section className="mt-10" aria-labelledby="guests-h">
        <SectionTitle id="guests-h">Guest bookers</SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-muted">People who booked without an account (latest 30{q ? " matching your search" : ""}).</p>
        {guests.length === 0 ? (
          <EmptyState title="No guest bookers" />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {guests.map((g) => {
              const n = gc.get(`${g.customerEmail}|${g.customerPhone}`) ?? 1;
              return (
                <li key={`${g.customerEmail}|${g.customerPhone}`}>
                  <Link
                    className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-0.5 px-4 py-2.5 transition hover:bg-surface active:bg-surface"
                    href={`/admin/bookings?${new URLSearchParams({ from: "2020-01-01", to: "2099-12-31", q: g.customerEmail || g.customerPhone })}`}
                  >
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block font-semibold text-brand-700">{g.customerName}</span>
                      <span className="block truncate text-xs text-muted">
                        {g.customerPhone}
                        {g.customerEmail ? ` · ${g.customerEmail}` : ""}
                      </span>
                    </span>
                    <span className="text-sm text-muted">
                      {n} booking{n === 1 ? "" : "s"} · latest {fmtDate(g.startsAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
