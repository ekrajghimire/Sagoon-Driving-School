import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageSquare, Mail, MapPin, ExternalLink, CircleCheck } from "lucide-react";
import { prisma, getSettings } from "@/lib/db";
import { requireStaff, isOwnerOrAdmin } from "@/lib/session";
import { fmtDate, fmtTime, fmtDateTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { SKILLS, RATING_LABELS } from "@/lib/skills";
import { ALL_STAFF } from "../../_lib/roles";
import { mapsUrl } from "../../_lib/dates";
import { PageHeader } from "../../_components/PageHeader";
import { StatusBadge, SplitBadge, isSplit } from "../../_components/StatusBadge";
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
  const [b, settings] = await Promise.all([
    prisma.booking.findUnique({
      where: { id },
      include: { skillRatings: true, packagePurchase: { include: { package: true } }, promoCode: true, user: true },
    }),
    getSettings(),
  ]);
  if (!b) notFound();
  // Other parts of a split lesson (e.g. a 2-hour lesson booked as two 1-hour sessions).
  const siblings = b.groupRef
    ? await prisma.booking.findMany({
        where: { groupRef: b.groupRef, id: { not: b.id } },
        orderBy: { startsAt: "asc" },
        select: { id: true, startsAt: true, endsAt: true, status: true },
      })
    : [];
  const ratings = Object.fromEntries(b.skillRatings.map((r) => [r.skill, r.rating]));
  const due = b.priceCents - b.discountCents;
  const active = b.status !== "CANCELLED";
  const tel = b.customerPhone.replace(/[^\d+]/g, "");
  // Cancelled lessons keep the panel only while paid, so a refund can still be recorded.
  const showPayment = isAdmin && (active || b.paymentStatus === "PAID") && b.paymentStatus !== "CREDIT" && !(b.paymentStatus === "FREE" && due <= 0);

  return (
    <>
      {sp.created && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-ok">
          <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Booking created.{b.customerEmail ? " The customer has been emailed" : " No email on file, so no confirmation was sent"}
            {b.calendarSync === "SYNCED" ? " and it's in Google Calendar." : "."}
          </span>
        </p>
      )}
      <PageHeader
        title={b.customerName}
        subtitle={
          <>
            {b.title} · <span className="font-mono">{b.ref}</span>
          </>
        }
        back={{ href: "/admin/bookings", label: "Bookings" }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <section className="card" aria-label="Booking details">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={b.status} />
              <StatusBadge status={b.paymentStatus} />
              <StatusBadge status={b.calendarSync} />
              {b.createdByStaff && <span className="badge bg-slate-100 text-slate-700">Phone booking</span>}
              {isSplit(b) && <SplitBadge />}
            </div>

            <p className="mt-4 text-xl font-extrabold tabular-nums">
              {fmtDate(b.startsAt)}
              <span className="block text-base font-bold text-brand-700">
                {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)} · {durationLabel(b.durationMins)}
              </span>
            </p>

            {siblings.length > 0 && (
              <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm">
                <p className="font-semibold text-violet-900">Part of a split lesson — other part{siblings.length === 1 ? "" : "s"}:</p>
                <ul className="mt-1 space-y-1">
                  {siblings.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/bookings/${s.id}`} className="font-semibold text-brand-700 underline">
                        {fmtDate(s.startsAt)}, {fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}
                      </Link>
                      <StatusBadge status={s.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <a href={`tel:${tel}`} className="btn-outline btn-sm">
                <Phone className="size-4" aria-hidden /> Call
              </a>
              <a href={`sms:${tel}`} className="btn-outline btn-sm">
                <MessageSquare className="size-4" aria-hidden /> Text
              </a>
              {b.customerEmail ? (
                <a href={`mailto:${b.customerEmail}`} className="btn-outline btn-sm">
                  <Mail className="size-4" aria-hidden /> Email
                </a>
              ) : (
                <span className="btn-outline btn-sm pointer-events-none opacity-50" aria-disabled>
                  <Mail className="size-4" aria-hidden /> No email
                </span>
              )}
              <a href={mapsUrl(b.pickupAddress, b.pickupSuburb)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                <MapPin className="size-4" aria-hidden /> Directions
              </a>
            </div>

            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Pickup</dt>
                <dd className="font-semibold">
                  {b.pickupAddress}, {b.pickupSuburb}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Phone</dt>
                <dd className="font-semibold">{b.customerPhone}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="font-semibold break-all">{b.customerEmail || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Account</dt>
                <dd className="font-semibold">
                  {b.user ? (
                    isAdmin ? (
                      <Link className="text-brand-700 underline" href={`/admin/customers/${b.user.id}`}>
                        {b.user.name}
                      </Link>
                    ) : (
                      b.user.name
                    )
                  ) : (
                    "Guest booking"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Price</dt>
                <dd className="font-semibold">
                  {b.paymentStatus === "CREDIT" ? `Package credit — ${b.packagePurchase?.package.name ?? "package"} (${b.packagePurchase?.ref ?? "—"})` : aud(due)}
                  {b.discountCents > 0 && (
                    <span className="text-muted">
                      {" "}
                      (was {aud(b.priceCents)}
                      {b.promoCode ? `, code ${b.promoCode.code}` : ""})
                    </span>
                  )}
                  {b.paidAt && (
                    <span className="block text-xs text-muted">
                      Paid {fmtDateTime(b.paidAt)}
                      {b.paymentMethod ? ` · ${b.paymentMethod}` : ""}
                    </span>
                  )}
                </dd>
              </div>
              {b.customerNotes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Customer notes</dt>
                  <dd className="whitespace-pre-wrap rounded-lg bg-surface p-2">{b.customerNotes}</dd>
                </div>
              )}
              {b.status === "CANCELLED" && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Cancelled</dt>
                  <dd>
                    {b.cancelledAt && fmtDateTime(b.cancelledAt)} — {b.cancelReason ?? "no reason given"}
                  </dd>
                </div>
              )}
              {b.calendarError && b.calendarSync === "FAILED" && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Calendar error</dt>
                  <dd className="break-all text-xs text-danger">{b.calendarError}</dd>
                </div>
              )}
            </dl>

            {active && (
              <div className="mt-4 border-t border-line pt-4">
                <LessonQuickActions id={b.id} status={b.status} />
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/invoice/${b.manageToken}`} target="_blank" className="btn-ghost btn-sm">
                Tax invoice <ExternalLink className="size-3.5" aria-hidden />
              </Link>
              <Link href={`/booking/${b.manageToken}`} target="_blank" className="btn-ghost btn-sm">
                Customer&apos;s page <ExternalLink className="size-3.5" aria-hidden />
              </Link>
              {b.calendarSync !== "NOT_CONFIGURED" && b.calendarSync !== "SYNCED" && (
                <ActionForm action={retrySync}>
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton className="btn-ghost btn-sm">Retry calendar sync</SubmitButton>
                </ActionForm>
              )}
            </div>
          </section>

          <section className="card" aria-labelledby="notes-h">
            <h2 id="notes-h" className="font-bold">Lesson notes</h2>
            <p className="text-xs text-muted">Private — only staff can see these.</p>
            <ActionForm action={saveNotes} className="mt-2">
              <input type="hidden" name="id" value={b.id} />
              <label htmlFor="notes" className="sr-only">Instructor notes</label>
              <textarea id="notes" name="notes" rows={4} maxLength={5000} defaultValue={b.instructorNotes ?? ""} className="input" placeholder="What did you cover? What to work on next time?" />
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
                  <div key={s.key} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                    <label htmlFor={`r-${s.key}`} className="min-w-0 flex-1 text-sm">
                      {s.label}
                    </label>
                    <select id={`r-${s.key}`} name={`rating_${s.key}`} defaultValue={ratings[s.key] ?? ""} className="input min-h-9 w-auto py-1 text-sm">
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n} · {RATING_LABELS[n]}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div className="sticky bottom-16 z-10 -mx-2 mt-3 rounded-xl bg-white/95 p-2 backdrop-blur lg:static lg:mx-0 lg:p-0">
                <SubmitButton className="btn-brand btn-sm w-full sm:w-auto">Save progress</SubmitButton>
              </div>
            </ActionForm>
          </section>
        </div>

        {isAdmin && (
          <aside className="space-y-4">
            {showPayment && (
              <section className="card" aria-labelledby="pay-h">
                <h2 id="pay-h" className="font-bold">Payment</h2>
                <p className="text-sm text-muted">
                  {b.paymentStatus === "PAID" ? `Paid ${aud(due)}` : b.paymentStatus === "REFUNDED" ? "Refunded" : `${aud(due)} to collect`}
                </p>
                <ActionForm action={setPayment} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={b.id} />
                  {b.paymentStatus !== "PAID" && (
                    <>
                      <label htmlFor="pm" className="label">Method</label>
                      <select id="pm" name="paymentMethod" className="input" defaultValue={b.paymentMethod ?? "Card"}>
                        {["Card", "Cash", "PayID", "Bank transfer", "Gift voucher"].map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {b.paymentStatus !== "PAID" && (
                      <SubmitButton name="paymentStatus" value="PAID" className="btn-brand btn-sm flex-1">
                        Mark paid {due > 0 && aud(due)}
                      </SubmitButton>
                    )}
                    {b.paymentStatus === "PAID" && (
                      <SubmitButton name="paymentStatus" value="UNPAID" className="btn-outline btn-sm" confirm="Set this lesson back to unpaid?">
                        Mark unpaid
                      </SubmitButton>
                    )}
                    {b.paymentStatus === "PAID" && (
                      <SubmitButton name="paymentStatus" value="REFUNDED" className="btn-outline btn-sm" confirm="Record this payment as refunded? (Refund the money yourself first.)">
                        Mark refunded
                      </SubmitButton>
                    )}
                  </div>
                </ActionForm>
              </section>
            )}
            {b.status === "CONFIRMED" && (
              <section className="card space-y-3" aria-labelledby="change-h">
                <h2 id="change-h" className="font-bold">Change booking</h2>
                <RescheduleBox id={b.id} durationMins={b.durationMins} maxAdvanceDays={Math.max(settings.maxAdvanceDays, 180)} />
                <details className="group border-t border-line pt-3">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center font-semibold text-danger [&::-webkit-details-marker]:hidden">
                    Cancel this lesson…
                  </summary>
                  <ActionForm action={cancelAsStaff} className="mt-2 space-y-2">
                    <input type="hidden" name="id" value={b.id} />
                    <label htmlFor="reason" className="label">Reason (emailed to customer)</label>
                    <input id="reason" name="reason" maxLength={300} className="input" placeholder="e.g. Instructor unwell — sorry!" />
                    <SubmitButton className="btn-danger btn-sm w-full" confirm={`Cancel ${b.customerName}'s lesson on ${fmtDate(b.startsAt)} at ${fmtTime(b.startsAt)} and email them? This can't be undone.`}>
                      Cancel lesson
                    </SubmitButton>
                    <p className="help">Package credits and promo uses are returned automatically. Waitlisted customers for that day are notified.</p>
                  </ActionForm>
                </details>
              </section>
            )}
            <section className="card space-y-0.5 text-xs text-muted">
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
