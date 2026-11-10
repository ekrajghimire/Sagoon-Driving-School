import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Phone, MessageSquare, Mail, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate, fmtTime, fmtDateTime, fmtSydney } from "@/lib/time";
import { aud } from "@/lib/money";
import { SKILLS, RATING_LABELS } from "@/lib/skills";
import { ADMINS } from "../../_lib/roles";
import { PageHeader, EmptyState } from "../../_components/PageHeader";
import { StatusBadge, SplitBadge, isSplit } from "../../_components/StatusBadge";
import { ActionForm } from "../../_components/ActionForm";
import { SubmitButton } from "../../_components/SubmitButton";
import { updateLearner, updatePurchase, changeRole } from "../../actions/customers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff(ADMINS);
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      bookings: { orderBy: { startsAt: "desc" }, take: 100 },
      purchases: { orderBy: { createdAt: "desc" }, include: { package: true } },
      addresses: true,
      skillRatings: { orderBy: { createdAt: "desc" } },
      accounts: { select: { providerId: true } },
      _count: { select: { bookings: true } },
    },
  });
  if (!u) notFound();
  const latest = new Map<string, { rating: number; at: Date }>();
  for (const r of u.skillRatings) if (!latest.has(r.skill)) latest.set(r.skill, { rating: r.rating, at: r.createdAt });
  const credits = u.purchases.filter((p) => p.status === "PAID" || p.status === "PENDING_PAYMENT").reduce((n, p) => n + p.creditsTotal - p.creditsUsed, 0);
  const now = new Date();
  const upcoming = u.bookings.filter((b) => b.status === "CONFIRMED" && b.startsAt > now).reverse();
  const past = u.bookings.filter((b) => !(b.status === "CONFIRMED" && b.startsAt > now));
  const tel = (u.phone ?? "").replace(/[^\d+]/g, "");
  const providers = u.accounts.map((a) => (a.providerId === "credential" ? "email & password" : a.providerId)).join(", ") || "no login";

  return (
    <>
      <PageHeader title={u.name} subtitle={`Joined ${fmtDate(u.createdAt)} · ${providers}`} back={{ href: "/admin/customers", label: "Customers" }}>
        <Link href={`/admin/bookings/new?customer=${u.id}`} className="btn-primary btn-sm">
          <Plus className="size-4" aria-hidden /> Book lesson
        </Link>
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
        {tel ? (
          <>
            <a href={`tel:${tel}`} className="btn-outline btn-sm">
              <Phone className="size-4" aria-hidden /> Call
            </a>
            <a href={`sms:${tel}`} className="btn-outline btn-sm">
              <MessageSquare className="size-4" aria-hidden /> Text
            </a>
          </>
        ) : null}
        <a href={`mailto:${u.email}`} className="btn-outline btn-sm">
          <Mail className="size-4" aria-hidden /> Email
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card lg:col-span-2" aria-labelledby="bk-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="bk-h" className="font-bold">Lessons</h2>
            <p className="text-sm text-muted">
              {u._count.bookings} total{u._count.bookings > u.bookings.length ? ` · showing latest ${u.bookings.length}` : ""}
            </p>
          </div>
          {u.bookings.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No lessons yet" action={<Link href={`/admin/bookings/new?customer=${u.id}`} className="btn-outline btn-sm">Book their first lesson</Link>} />
            </div>
          ) : (
            <>
              {upcoming.length > 0 && <h3 className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">Upcoming</h3>}
              <BookingRows rows={upcoming} />
              {past.length > 0 && <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">History</h3>}
              <BookingRows rows={past} />
            </>
          )}
        </section>

        <section className="card" aria-labelledby="ld-h">
          <h2 id="ld-h" className="font-bold">Profile &amp; learner details</h2>
          <p className="text-sm text-muted break-all">{u.email}</p>
          <ActionForm action={updateLearner} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={u.id} />
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={u.name} className="input" required minLength={2} maxLength={100} />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" type="tel" inputMode="tel" maxLength={30} defaultValue={u.phone ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ln">Licence number</label>
              <input id="ln" name="licenceNumber" maxLength={40} defaultValue={u.licenceNumber ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="lt">Licence type</label>
              <input id="lt" name="licenceType" list="lic-types" maxLength={60} defaultValue={u.licenceType ?? ""} className="input" />
              <datalist id="lic-types">
                {["Learner (L)", "Provisional P1", "Provisional P2", "Overseas licence", "Full licence"].map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="td">Driving test date</label>
              <input id="td" name="testDate" type="date" defaultValue={u.testDate ? fmtSydney(u.testDate, "yyyy-MM-dd") : ""} className="input" />
            </div>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input type="checkbox" name="marketingOptIn" defaultChecked={u.marketingOptIn} className="size-5" /> Marketing emails OK
            </label>
            <div className="sm:col-span-2">
              <SubmitButton>Save details</SubmitButton>
            </div>
          </ActionForm>
          {u.privacyConsentAt && <p className="mt-2 text-xs text-muted">Privacy consent recorded {fmtDateTime(u.privacyConsentAt)}</p>}
        </section>

        <section className="card" aria-labelledby="pr-h">
          <h2 id="pr-h" className="font-bold">Progress</h2>
          <ul className="mt-3 space-y-2">
            {SKILLS.map((s) => {
              const r = latest.get(s.key);
              return (
                <li key={s.key} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{s.label}</span>
                    <span className={`shrink-0 font-semibold ${r ? "" : "text-muted"}`}>{r ? `${r.rating}/5 · ${RATING_LABELS[r.rating]}` : "Not yet"}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface" aria-hidden>
                    <div className={`h-2 rounded-full ${r?.rating === 5 ? "bg-ok" : "bg-brand-500"}`} style={{ width: `${((r?.rating ?? 0) / 5) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card lg:col-span-2" aria-labelledby="pk-h">
          <h2 id="pk-h" className="font-bold">
            Packages · {credits} credit{credits === 1 ? "" : "s"} left
          </h2>
          {u.purchases.length ? (
            <div className="mt-3 space-y-3">
              {u.purchases.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {p.package.name} · {aud(p.priceCents - p.discountCents)}
                      <span className="ml-1 font-mono text-xs font-normal text-muted">{p.ref}</span>
                    </p>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-muted">
                    {p.creditsUsed}/{p.creditsTotal} used · bought {fmtDate(p.createdAt)}
                    {p.paidAt && ` · paid ${fmtDate(p.paidAt)}${p.paymentMethod ? ` (${p.paymentMethod})` : ""}`}
                  </p>
                  <ActionForm action={updatePurchase} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    {p.status === "PENDING_PAYMENT" && (
                      <>
                        <label htmlFor={`pm-${p.id}`} className="sr-only">Payment method</label>
                        <select id={`pm-${p.id}`} name="paymentMethod" className="input min-h-9 w-auto py-1 text-sm">
                          {["Card", "Cash", "PayID", "Bank transfer"].map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                        <SubmitButton name="status" value="PAID">Mark paid</SubmitButton>
                      </>
                    )}
                    {(p.status === "PENDING_PAYMENT" || p.status === "PAID") && (
                      <SubmitButton name="status" value="CANCELLED" className="btn-danger btn-sm" confirm="Cancel this package? Unused credits will no longer be available.">
                        Cancel package
                      </SubmitButton>
                    )}
                    {p.status === "PAID" && (
                      <SubmitButton name="status" value="REFUNDED" className="btn-outline btn-sm" confirm="Mark as refunded? Refund the money yourself first; unused credits will be removed.">
                        Mark refunded
                      </SubmitButton>
                    )}
                    {(p.status === "CANCELLED" || p.status === "REFUNDED") && (
                      <SubmitButton name="status" value="PENDING_PAYMENT" className="btn-ghost btn-sm" confirm="Reinstate this package as payment due? Its unused credits become usable again.">
                        Reinstate
                      </SubmitButton>
                    )}
                  </ActionForm>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No packages.</p>
          )}
        </section>

        <section className="card" aria-labelledby="ad-h">
          <h2 id="ad-h" className="font-bold">Saved addresses</h2>
          {u.addresses.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {u.addresses.map((a) => (
                <li key={a.id}>
                  <span className="font-semibold">{a.label}:</span> {a.address}, {a.suburb}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">None saved.</p>
          )}
        </section>

        {me.role === "OWNER" && (
          <section className="card" aria-labelledby="rl-h">
            <h2 id="rl-h" className="font-bold">Admin access</h2>
            {u.id === me.id ? (
              <p className="mt-2 text-sm text-muted">This is you (owner). You can&apos;t change your own access.</p>
            ) : (
              <ActionForm action={changeRole} className="mt-2 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={u.id} />
                <div>
                  <label htmlFor="role" className="label">Access level</label>
                  <select id="role" name="role" defaultValue={u.role} className="input">
                    <option value="CUSTOMER">Customer (no admin access)</option>
                    <option value="INSTRUCTOR">Instructor</option>
                    <option value="STAFF">Admin staff</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <SubmitButton confirm={`Change ${u.name}'s access level?`}>Update access</SubmitButton>
              </ActionForm>
            )}
          </section>
        )}
      </div>
    </>
  );
}

type Row = { id: string; startsAt: Date; title: string; status: string; paymentStatus: string; durationMins: number };

function BookingRows({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
      {rows.map((b) => (
        <li key={b.id}>
          <Link href={`/admin/bookings/${b.id}`} className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 transition hover:bg-surface active:bg-surface">
            <span className="min-w-0 flex-1 basis-40">
              <span className="block font-semibold tabular-nums">
                {fmtDate(b.startsAt)} · {fmtTime(b.startsAt)}
              </span>
              <span className="block truncate text-xs text-muted">{b.title}</span>
            </span>
            <span className="flex flex-wrap gap-1">
              <StatusBadge status={b.status} />
              <StatusBadge status={b.paymentStatus} />
              {isSplit(b) && <SplitBadge />}
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
