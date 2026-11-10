import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma, getSettings } from "@/lib/db";
import { requireStaff, isOwnerOrAdmin } from "@/lib/session";
import { fmtDate, fmtTime, fmtDateTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { SKILLS, RATING_LABELS } from "@/lib/skills";
import { ALL_STAFF } from "../../_lib/roles";
import { mapsUrl } from "../../_lib/dates";
import { PageHeader } from "../../_components/PageHeader";
import { StatusBadge } from "../../_components/StatusBadge";
import { ActionForm } from "../../_components/ActionForm";
import { SubmitButton } from "../../_components/SubmitButton";
import { LessonQuickActions } from "../../_components/LessonQuickActions";
import { setPayment, cancelAsStaff, saveNotes, saveRatings, retrySync } from "../../actions/bookings";
import { RescheduleBox } from "./RescheduleBox";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking" };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireStaff(ALL_STAFF);
  const isAdmin = isOwnerOrAdmin(user.role);
  const { id } = await params;
  const sp = await searchParams;
  const b = await prisma.booking.findUnique({
    where: { id },
    include: { skillRatings: true, lessonType: true, packagePurchase: { include: { package: true } }, promoCode: true, user: true },
  });
  if (!b) notFound();
  const settings = await getSettings();
  const ratings = Object.fromEntries(b.skillRatings.map((r) => [r.skill, r.rating]));
  const due = b.priceCents - b.discountCents;
  const active = b.status !== "CANCELLED";

  return (
    <>
      {sp.created && <p role="status" className="mb-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-ok">✓ Booking created. The customer has been emailed{b.calendarSync === "SYNCED" ? " and it's in Google Calendar" : ""}.</p>}
      <PageHeader title={b.customerName} subtitle={`${b.title} · ${b.ref}`}>
        <Link href="/admin/bookings" className="btn-ghost btn-sm">← All bookings</Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="card">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={b.status} />
              <StatusBadge status={b.paymentStatus} />
              <StatusBadge status={b.calendarSync} />
              {b.createdByStaff && <span className="badge bg-slate-100 text-slate-700">Phone booking</span>}
            </div>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">When</dt><dd className="font-semibold">{fmtDate(b.startsAt)}, {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)} ({durationLabel(b.durationMins)})</dd></div>
              <div><dt className="text-muted">Pickup</dt><dd><a className="font-semibold text-brand-700 underline" target="_blank" rel="noopener noreferrer" href={mapsUrl(b.pickupAddress, b.pickupSuburb)}>{b.pickupAddress}, {b.pickupSuburb}</a></dd></div>
              <div><dt className="text-muted">Phone</dt><dd><a className="font-semibold text-brand-700" href={`tel:${b.customerPhone}`}>{b.customerPhone}</a></dd></div>
              <div><dt className="text-muted">Email</dt><dd className="font-semibold break-all">{b.customerEmail ? <a href={`mailto:${b.customerEmail}`}>{b.customerEmail}</a> : "—"}</dd></div>
              <div>
                <dt className="text-muted">Account</dt>
                <dd className="font-semibold">{b.user ? (isAdmin ? <Link className="text-brand-700 underline" href={`/admin/customers/${b.user.id}`}>{b.user.name}</Link> : b.user.name) : "Guest booking"}</dd>
              </div>
              <div>
                <dt className="text-muted">Price</dt>
                <dd className="font-semibold">
                  {b.paymentStatus === "CREDIT" ? `Package credit — ${b.packagePurchase?.package.name} (${b.packagePurchase?.ref})` : aud(due)}
                  {b.discountCents > 0 && <span className="text-muted"> (was {aud(b.priceCents)}, code {b.promoCode?.code})</span>}
                  {b.paidAt && <span className="block text-xs text-muted">Paid {fmtDateTime(b.paidAt)}{b.paymentMethod ? ` · ${b.paymentMethod}` : ""}</span>}
                </dd>
              </div>
              {b.customerNotes && <div className="sm:col-span-2"><dt className="text-muted">Customer notes</dt><dd className="whitespace-pre-wrap">{b.customerNotes}</dd></div>}
              {b.status === "CANCELLED" && <div className="sm:col-span-2"><dt className="text-muted">Cancelled</dt><dd>{b.cancelledAt && fmtDateTime(b.cancelledAt)} — {b.cancelReason ?? "no reason"}</dd></div>}
              {b.calendarError && b.calendarSync === "FAILED" && <div className="sm:col-span-2"><dt className="text-muted">Calendar error</dt><dd className="text-xs text-danger break-all">{b.calendarError}</dd></div>}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              <LessonQuickActions id={b.id} status={b.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/invoice/${b.manageToken}`} target="_blank" className="btn-ghost btn-sm">Tax invoice ↗</Link>
              <Link href={`/booking/${b.manageToken}`} target="_blank" className="btn-ghost btn-sm">Customer&apos;s manage page ↗</Link>
              {b.calendarSync !== "NOT_CONFIGURED" && b.calendarSync !== "SYNCED" && (
                <ActionForm action={retrySync}><input type="hidden" name="id" value={b.id} /><SubmitButton className="btn-ghost btn-sm">Retry calendar sync</SubmitButton></ActionForm>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="notes-h">
            <h2 id="notes-h" className="font-bold">Lesson notes (private)</h2>
            <ActionForm action={saveNotes} className="mt-2">
              <input type="hidden" name="id" value={b.id} />
              <label htmlFor="notes" className="sr-only">Instructor notes</label>
              <textarea id="notes" name="notes" rows={4} defaultValue={b.instructorNotes ?? ""} className="input" placeholder="What did you cover? What to work on next time?" />
              <SubmitButton className="btn-brand btn-sm mt-2">Save notes</SubmitButton>
            </ActionForm>
          </section>

          <section className="card" aria-labelledby="skills-h">
            <h2 id="skills-h" className="font-bold">Skill progress</h2>
            <p className="text-sm text-muted">Rate what you worked on (1 = introduced … 5 = test ready). The student sees their latest rating per skill.</p>
            <ActionForm action={saveRatings} className="mt-3">
              <input type="hidden" name="id" value={b.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                {SKILLS.map((s) => (
                  <div key={s.key} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <label htmlFor={`r-${s.key}`} className="text-sm">{s.label}</label>
                    <select id={`r-${s.key}`} name={`rating_${s.key}`} defaultValue={ratings[s.key] ?? ""} className="input min-h-9 w-auto py-1 text-sm">
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} · {RATING_LABELS[n]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <SubmitButton className="btn-brand btn-sm mt-3">Save progress</SubmitButton>
            </ActionForm>
          </section>
        </div>

        {isAdmin && (
          <aside className="space-y-4">
            {active && b.paymentStatus !== "CREDIT" && (
              <section className="card" aria-labelledby="pay-h">
                <h2 id="pay-h" className="font-bold">Payment</h2>
                <ActionForm action={setPayment} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={b.id} />
                  <label htmlFor="pm" className="label">Method</label>
                  <select id="pm" name="paymentMethod" className="input" defaultValue={b.paymentMethod ?? "Card"}>
                    {["Card", "Cash", "PayID", "Bank transfer", "Gift voucher"].map((m) => <option key={m}>{m}</option>)}
                  </select>
                  <div className="flex flex-wrap gap-2">
                    {b.paymentStatus !== "PAID" && <SubmitButton name="paymentStatus" value="PAID" className="btn-brand btn-sm">Mark paid {due > 0 && aud(due)}</SubmitButton>}
                    {b.paymentStatus === "PAID" && <SubmitButton name="paymentStatus" value="UNPAID" className="btn-outline btn-sm">Mark unpaid</SubmitButton>}
                    {b.paymentStatus === "PAID" && <SubmitButton name="paymentStatus" value="REFUNDED" className="btn-outline btn-sm" confirm="Record this payment as refunded? (Refund the money yourself first.)">Mark refunded</SubmitButton>}
                  </div>
                </ActionForm>
              </section>
            )}
            {b.status === "CONFIRMED" && (
              <section className="card space-y-3" aria-labelledby="change-h">
                <h2 id="change-h" className="font-bold">Change booking</h2>
                <RescheduleBox id={b.id} durationMins={b.durationMins} maxAdvanceDays={Math.max(settings.maxAdvanceDays, 180)} />
                <ActionForm action={cancelAsStaff} className="space-y-2 border-t border-line pt-3">
                  <input type="hidden" name="id" value={b.id} />
                  <label htmlFor="reason" className="label">Cancel — reason (emailed to customer)</label>
                  <input id="reason" name="reason" className="input" placeholder="e.g. Instructor unwell — sorry!" />
                  <SubmitButton className="btn-danger btn-sm" confirm="Cancel this lesson and email the customer?">Cancel lesson</SubmitButton>
                  <p className="help">Package credits and promo uses are returned automatically. Waitlisted customers for that day are notified.</p>
                </ActionForm>
              </section>
            )}
            <section className="card text-xs text-muted">
              <p>Created {fmtDateTime(b.createdAt)}</p>
              <p>Updated {fmtDateTime(b.updatedAt)}</p>
              {b.reminder24SentAt && <p>24h reminder sent {fmtDateTime(b.reminder24SentAt)}</p>}
              {b.reminder2SentAt && <p>2h reminder sent {fmtDateTime(b.reminder2SentAt)}</p>}
              {b.reviewRequestSentAt && <p>Review request sent {fmtDateTime(b.reviewRequestSentAt)}</p>}
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
