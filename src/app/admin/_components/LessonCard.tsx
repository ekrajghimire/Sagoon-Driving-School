import Link from "next/link";
import { Phone, MapPin, StickyNote, MessageSquare, ChevronRight } from "lucide-react";
import { fmtTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { mapsUrl } from "../_lib/dates";
import { StatusBadge, SplitBadge } from "./StatusBadge";
import { LessonQuickActions } from "./LessonQuickActions";

export type LessonCardBooking = {
  id: string;
  ref: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  durationMins: number;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupSuburb: string;
  customerNotes: string | null;
  status: string;
  paymentStatus: string;
  priceCents: number;
  discountCents: number;
  /** Set when a 2-hour lesson was split into two 1-hour bookings. */
  groupRef?: string | null;
};

/** One lesson on the Today page: big time, one-tap call / text / directions, then status actions. */
export function LessonCard({ b, showPayment = true, flag }: { b: LessonCardBooking; showPayment?: boolean; flag?: string }) {
  const due = b.priceCents - b.discountCents;
  const tel = b.customerPhone.replace(/[^\d+]/g, "");
  return (
    <article className={`card p-4 ${b.status === "CONFIRMED" ? "border-l-4 border-l-brand-500" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {flag && <p className="mb-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ink">{flag}</p>}
          <p className="text-lg font-extrabold tabular-nums">
            {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)}
            <span className="ml-1.5 text-sm font-semibold text-muted">{durationLabel(b.durationMins)}</span>
          </p>
          <Link
            href={`/admin/bookings/${b.id}`}
            className="group inline-flex min-h-8 items-center gap-1 text-base font-bold text-brand-700 hover:underline"
          >
            {b.customerName}
            <ChevronRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <p className="text-sm text-muted">
            {b.title} · <span className="font-mono text-xs">{b.ref}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={b.status} />
          {showPayment && <StatusBadge status={b.paymentStatus} />}
          {b.groupRef && <SplitBadge />}
        </div>
      </div>

      <p className="mt-2 flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
        <span>
          {b.pickupAddress}, <strong>{b.pickupSuburb}</strong>
        </span>
      </p>
      {b.customerNotes && (
        <p className="mt-1 flex items-start gap-2 rounded-lg bg-surface px-2 py-1.5 text-sm">
          <StickyNote className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> <span className="whitespace-pre-wrap">{b.customerNotes}</span>
        </p>
      )}
      {showPayment && b.paymentStatus === "UNPAID" && due > 0 && (
        <p className="mt-2 text-sm font-bold text-amber-700">To collect: {aud(due)}</p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={`tel:${tel}`} className="btn-outline btn-sm px-2" aria-label={`Call ${b.customerName}`}>
          <Phone className="size-4" aria-hidden /> Call
        </a>
        <a href={`sms:${tel}`} className="btn-outline btn-sm px-2" aria-label={`Text ${b.customerName}`}>
          <MessageSquare className="size-4" aria-hidden /> Text
        </a>
        <a href={mapsUrl(b.pickupAddress, b.pickupSuburb)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm px-2" aria-label="Directions to pickup">
          <MapPin className="size-4" aria-hidden /> Map
        </a>
      </div>
      <div className="mt-2">
        <LessonQuickActions id={b.id} status={b.status} />
      </div>
    </article>
  );
}
