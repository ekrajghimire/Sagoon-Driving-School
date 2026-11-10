import Link from "next/link";
import { Phone, MapPin, StickyNote } from "lucide-react";
import { fmtTime, durationLabel } from "@/lib/time";
import { aud } from "@/lib/money";
import { mapsUrl } from "../_lib/dates";
import { StatusBadge } from "./StatusBadge";
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
};

export function LessonCard({ b }: { b: LessonCardBooking }) {
  const due = b.priceCents - b.discountCents;
  return (
    <article className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold">
            {fmtTime(b.startsAt)} – {fmtTime(b.endsAt)} <span className="text-sm font-semibold text-muted">({durationLabel(b.durationMins)})</span>
          </p>
          <Link href={`/admin/bookings/${b.id}`} className="font-bold text-brand-700 underline-offset-2 hover:underline">
            {b.customerName}
          </Link>
          <span className="text-sm text-muted"> · {b.title} · {b.ref}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <StatusBadge status={b.status} />
          <StatusBadge status={b.paymentStatus} />
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <a href={`tel:${b.customerPhone}`} className="flex items-center gap-2 font-semibold text-brand-700">
          <Phone className="size-4" aria-hidden /> {b.customerPhone}
        </a>
        <a href={mapsUrl(b.pickupAddress, b.pickupSuburb)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 font-semibold text-brand-700">
          <MapPin className="size-4" aria-hidden /> {b.pickupAddress}, {b.pickupSuburb}
        </a>
        {b.customerNotes && (
          <p className="flex items-start gap-2 sm:col-span-2">
            <StickyNote className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden /> {b.customerNotes}
          </p>
        )}
        {b.paymentStatus === "UNPAID" && due > 0 && <p className="font-semibold text-amber-700 sm:col-span-2">To collect: {aud(due)}</p>}
      </div>
      <div className="mt-3">
        <LessonQuickActions id={b.id} status={b.status} />
      </div>
    </article>
  );
}
