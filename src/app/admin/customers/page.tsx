import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader } from "../_components/PageHeader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };
const PER_PAGE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff(ADMINS);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}),
  };
  const guestWhere: Prisma.BookingWhereInput = {
    userId: null,
    ...(q ? { OR: [{ customerName: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }] } : {}),
  };
  const [total, users, guests, guestCounts] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        purchases: { where: { status: { in: ["PAID", "PENDING_PAYMENT"] } }, select: { creditsTotal: true, creditsUsed: true } },
        bookings: { where: { status: { in: ["CONFIRMED", "COMPLETED"] } }, select: { startsAt: true }, orderBy: { startsAt: "desc" } },
      },
    }),
    prisma.booking.findMany({ where: guestWhere, distinct: ["customerEmail"], orderBy: { startsAt: "desc" }, take: 30, select: { customerEmail: true, customerName: true, customerPhone: true, startsAt: true } }),
    prisma.booking.groupBy({ by: ["customerEmail"], where: guestWhere, _count: { _all: true } }),
  ]);
  const gc = Object.fromEntries(guestCounts.map((g) => [g.customerEmail, g._count._all]));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const now = new Date();

  return (
    <>
      <PageHeader title="Customers" subtitle={`${total} registered customer${total === 1 ? "" : "s"}`}>
        {/* Plain link: this is a CSV download route handler, not a page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/customers/export" className="btn-outline btn-sm">Export CSV</a>
      </PageHeader>
      <form method="get" className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">Search customers</label>
        <input id="q" name="q" defaultValue={q} className="input" placeholder="Search name, email or phone" />
        <button className="btn-brand">Search</button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="table-x min-w-[720px]">
          <thead className="bg-surface"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Lessons</th><th>Credits left</th><th>Last lesson</th><th>Next lesson</th></tr></thead>
          <tbody>
            {users.map((u) => {
              const past = u.bookings.filter((b) => b.startsAt <= now);
              const next = u.bookings.filter((b) => b.startsAt > now).at(-1);
              return (
                <tr key={u.id} className="hover:bg-surface">
                  <td><Link href={`/admin/customers/${u.id}`} className="font-semibold text-brand-700 hover:underline">{u.name}</Link></td>
                  <td className="break-all">{u.email}</td>
                  <td>{u.phone ?? "—"}</td>
                  <td>{u.bookings.length}</td>
                  <td>{u.purchases.reduce((n, p) => n + p.creditsTotal - p.creditsUsed, 0)}</td>
                  <td>{past[0] ? fmtDate(past[0].startsAt) : "—"}</td>
                  <td>{next ? fmtDate(next.startsAt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!users.length && <p className="mt-3 text-sm text-muted">No registered customers found.</p>}
      {pages > 1 && (
        <nav className="mt-3 flex items-center gap-2" aria-label="Pagination">
          {page > 1 && <Link className="btn-outline btn-sm" href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>← Prev</Link>}
          <span className="text-sm text-muted">Page {page} of {pages}</span>
          {page < pages && <Link className="btn-outline btn-sm" href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>Next →</Link>}
        </nav>
      )}

      <h2 className="mt-10 text-xl font-extrabold">Guest bookers</h2>
      <p className="text-sm text-muted">People who booked without an account (latest 30{q ? " matching your search" : ""}).</p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-line">
        <table className="table-x min-w-[600px]">
          <thead className="bg-surface"><tr><th>Name</th><th>Email</th><th>Phone</th><th>Bookings</th><th>Latest</th></tr></thead>
          <tbody>
            {guests.map((g) => (
              <tr key={g.customerEmail || g.customerPhone}>
                <td><Link className="font-semibold text-brand-700 hover:underline" href={`/admin/bookings?from=2020-01-01&to=2099-12-31&q=${encodeURIComponent(g.customerEmail || g.customerPhone)}`}>{g.customerName}</Link></td>
                <td className="break-all">{g.customerEmail || "—"}</td>
                <td>{g.customerPhone}</td>
                <td>{gc[g.customerEmail] ?? 1}</td>
                <td>{fmtDate(g.startsAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
