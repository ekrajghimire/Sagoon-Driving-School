import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CalendarPlus, FileText } from "lucide-react";
import { prisma, getSettings } from "@/lib/db";
import { canCustomerChange } from "@/lib/booking-service";
import { fmtDate, fmtTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { SITE } from "@/lib/site";
import { ManageBooking } from "./ManageBooking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

const STATUS: Record<string, string> = { CONFIRMED: "Confirmed", COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "Missed" };

export default async function BookingPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ new?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const b = await prisma.booking.findUnique({ where: { manageToken: token } });
  if (!b) notFound();
  const settings = await getSettings();
  const due = b.priceCents - b.discountCents;

  return (
    <div className="bg-surface py-10">
      <div className="container-x max-w-3xl">
        {sp.new && b.status === "CONFIRMED" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-green-50 p-5" role="status">
            <CheckCircle2 className="size-7 shrink-0 text-ok" aria-hidden />
            <div>
              <h1 className="text-2xl font-extrabold">You&apos;re booked in!</h1>
              <p className="mt-1 text-sm">A confirmation has been sent to <strong>{b.customerEmail}</strong>. Bookmark this page to manage your lesson any time.</p>
            </div>
          </div>
        )}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Booking {b.ref}</p>
              <h2 className="mt-1 text-2xl font-extrabold">{b.title}</h2>
            </div>
            <span className={`badge ${b.status === "CONFIRMED" ? "bg-green-100 text-ok" : b.status === "CANCELLED" ? "bg-red-100 text-danger" : "bg-surface text-ink"}`}>{STATUS[b.status]}</span>
          </div>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Date</dt><dd className="font-semibold">{fmtDate(b.startsAt)}</dd></div>
            <div><dt className="text-muted">Time</dt><dd className="font-semibold">{fmtTime(b.startsAt)} – {fmtTime(b.endsAt)} ({durationLabel(b.durationMins)})</dd></div>
            <div><dt className="text-muted">Pickup</dt><dd className="font-semibold">{b.pickupAddress}, {b.pickupSuburb}</dd></div>
            <div><dt className="text-muted">Car</dt><dd className="font-semibold">Automatic, dual controls</dd></div>
            <div>
              <dt className="text-muted">Payment</dt>
              <dd className="font-semibold">
                {b.paymentStatus === "CREDIT" ? "Package credit" : b.paymentStatus === "PAID" ? `Paid ${aud(due)}` : b.paymentStatus === "FREE" ? "No charge" : `${aud(due)} incl. GST — pay on the day`}
              </dd>
            </div>
            <div><dt className="text-muted">Name</dt><dd className="font-semibold">{b.customerName}</dd></div>
          </dl>

          {b.status === "CONFIRMED" && (
            <>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={`/api/ics/${token}`} className="btn-outline btn-sm"><CalendarPlus className="size-4" /> Add to my calendar</a>
                <Link href={`/invoice/${token}`} className="btn-outline btn-sm"><FileText className="size-4" /> Tax invoice</Link>
              </div>
              <div className="mt-6 border-t border-line pt-6">
                <h3 className="mb-3 font-bold">Need to make a change?</h3>
                <ManageBooking token={token} durationMins={b.durationMins} canChange={canCustomerChange(b, settings.cancellationWindowHours)} windowHours={settings.cancellationWindowHours} maxAdvanceDays={settings.maxAdvanceDays} />
              </div>
            </>
          )}
        </div>

        {b.status === "CONFIRMED" && (
          <div className="card mt-6">
            <h3 className="font-bold">Before your lesson</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              <li>Bring your learner licence (or overseas licence) — we can&apos;t start without it.</li>
              <li>Wear flat, comfortable shoes and bring glasses if you need them.</li>
              <li>Be ready at your pickup address a few minutes early.</li>
              <li>Feeling nervous? Totally normal. Read our <Link className="font-semibold text-brand-700 underline" href="/resources">tips for calm lessons</Link>.</li>
            </ul>
            <p className="mt-4 text-sm text-muted">Questions? Call or text <a className="font-semibold text-brand-700" href={`tel:${SITE.phoneTel}`}>{SITE.phoneDisplay}</a>.</p>
          </div>
        )}
        <p className="mt-6 text-center text-sm"><Link href="/book" className="font-semibold text-brand-700 underline">Book another lesson</Link></p>
      </div>
    </div>
  );
}
