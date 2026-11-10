import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate, fmtTime, fmtDateTime, fmtSydney } from "@/lib/time";
import { aud } from "@/lib/money";
import { SKILLS, RATING_LABELS } from "@/lib/skills";
import { ADMINS } from "../../_lib/roles";
import { PageHeader } from "../../_components/PageHeader";
import { StatusBadge } from "../../_components/StatusBadge";
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
    },
  });
  if (!u) notFound();
  const latest = new Map<string, { rating: number; at: Date }>();
  for (const r of u.skillRatings) if (!latest.has(r.skill)) latest.set(r.skill, { rating: r.rating, at: r.createdAt });
  const credits = u.purchases.filter((p) => p.status === "PAID" || p.status === "PENDING_PAYMENT").reduce((n, p) => n + p.creditsTotal - p.creditsUsed, 0);

  return (
    <>
      <PageHeader title={u.name} subtitle={`${u.email} · joined ${fmtDate(u.createdAt)} · ${u.accounts.map((a) => a.providerId).join(", ") || "no login"}`}>
        <Link href="/admin/customers" className="btn-ghost btn-sm">← Customers</Link>
        <Link href="/admin/bookings/new" className="btn-primary btn-sm">+ Book for customer</Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card" aria-labelledby="ld-h">
          <h2 id="ld-h" className="font-bold">Profile & learner details</h2>
          <ActionForm action={updateLearner} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={u.id} />
            <div><label className="label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={u.name} className="input" required /></div>
            <div><label className="label" htmlFor="phone">Phone</label><input id="phone" name="phone" defaultValue={u.phone ?? ""} className="input" /></div>
            <div><label className="label" htmlFor="ln">Licence number</label><input id="ln" name="licenceNumber" defaultValue={u.licenceNumber ?? ""} className="input" /></div>
            <div>
              <label className="label" htmlFor="lt">Licence type</label>
              <input id="lt" name="licenceType" list="lic-types" defaultValue={u.licenceType ?? ""} className="input" />
              <datalist id="lic-types">{["Learner (L)", "Provisional P1", "Provisional P2", "Overseas licence", "Full licence"].map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div><label className="label" htmlFor="td">Driving test date</label><input id="td" name="testDate" type="date" defaultValue={u.testDate ? fmtSydney(u.testDate, "yyyy-MM-dd") : ""} className="input" /></div>
            <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="marketingOptIn" defaultChecked={u.marketingOptIn} /> Marketing emails OK</label>
            <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
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
                  <div className="flex justify-between gap-2"><span>{s.label}</span><span className="font-semibold">{r ? `${r.rating}/5 · ${RATING_LABELS[r.rating]}` : "Not yet"}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-surface" aria-hidden><div className="h-2 rounded-full bg-brand-500" style={{ width: `${((r?.rating ?? 0) / 5) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card lg:col-span-2" aria-labelledby="pk-h">
          <h2 id="pk-h" className="font-bold">Packages · {credits} credit{credits === 1 ? "" : "s"} left</h2>
          {u.purchases.length ? (
            <div className="mt-3 space-y-3">
              {u.purchases.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{p.package.name} · {p.ref} · {aud(p.priceCents - p.discountCents)}</p>
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
                          {["Card", "Cash", "PayID", "Bank transfer"].map((m) => <option key={m}>{m}</option>)}
                        </select>
                        <SubmitButton name="status" value="PAID">Mark paid</SubmitButton>
                      </>
                    )}
                    {(p.status === "PENDING_PAYMENT" || p.status === "PAID") && (
                      <SubmitButton name="status" value="CANCELLED" className="btn-outline btn-sm" confirm="Cancel this package? Unused credits will no longer be available.">Cancel</SubmitButton>
                    )}
                    {p.status === "PAID" && (
                      <SubmitButton name="status" value="REFUNDED" className="btn-outline btn-sm" confirm="Mark as refunded? Refund the money yourself first; unused credits will be removed.">Refunded</SubmitButton>
                    )}
                    {(p.status === "CANCELLED" || p.status === "REFUNDED") && (
                      <SubmitButton name="status" value="PENDING_PAYMENT" className="btn-ghost btn-sm">Reinstate</SubmitButton>
                    )}
                  </ActionForm>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No packages.</p>
          )}
        </section>

        <section className="card lg:col-span-2" aria-labelledby="bk-h">
          <h2 id="bk-h" className="font-bold">Bookings ({u.bookings.length})</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="table-x min-w-[560px]">
              <thead><tr><th>When</th><th>Lesson</th><th>Status</th><th>Payment</th></tr></thead>
              <tbody>
                {u.bookings.map((b) => (
                  <tr key={b.id}>
                    <td><Link className="font-semibold text-brand-700 hover:underline" href={`/admin/bookings/${b.id}`}>{fmtDate(b.startsAt)} {fmtTime(b.startsAt)}</Link></td>
                    <td>{b.title}</td>
                    <td><StatusBadge status={b.status} /></td>
                    <td><StatusBadge status={b.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card" aria-labelledby="ad-h">
          <h2 id="ad-h" className="font-bold">Saved addresses</h2>
          {u.addresses.length ? (
            <ul className="mt-2 space-y-1 text-sm">{u.addresses.map((a) => <li key={a.id}>{a.label}: {a.address}, {a.suburb}</li>)}</ul>
          ) : (
            <p className="mt-2 text-sm text-muted">None saved.</p>
          )}
        </section>

        {me.role === "OWNER" && (
          <section className="card" aria-labelledby="rl-h">
            <h2 id="rl-h" className="font-bold">Role</h2>
            <ActionForm action={changeRole} className="mt-2 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={u.id} />
              <div>
                <label htmlFor="role" className="label">Access level</label>
                <select id="role" name="role" defaultValue={u.role} className="input" disabled={u.id === me.id}>
                  <option value="CUSTOMER">Customer</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="STAFF">Admin staff</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              {u.id !== me.id && <SubmitButton confirm="Change this user's access level?">Update role</SubmitButton>}
            </ActionForm>
          </section>
        )}
      </div>
    </>
  );
}
