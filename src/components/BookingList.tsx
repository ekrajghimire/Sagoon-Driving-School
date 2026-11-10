import Link from "next/link";
import { fmtDate, fmtTime, durationLabel } from "@/lib/time";

type B = { id: string; ref: string; title: string; startsAt: Date; endsAt: Date; durationMins: number; status: string; manageToken: string; pickupSuburb: string; paymentStatus: string };
const STATUS: Record<string, string> = { CONFIRMED: "bg-green-100 text-ok", COMPLETED: "bg-brand-50 text-brand-800", CANCELLED: "bg-red-100 text-danger", NO_SHOW: "bg-amber-100 text-amber-900" };
const LABEL: Record<string, string> = { CONFIRMED: "Upcoming", COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "Missed" };

export function BookingList({ items, empty }: { items: B[]; empty: React.ReactNode }) {
  if (!items.length) return <div className="rounded-xl bg-white p-6 text-center text-muted">{empty}</div>;
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((b) => (
        <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-bold">{fmtDate(b.startsAt)} · {fmtTime(b.startsAt)}</p>
            <p className="text-sm text-muted">{b.title} · {durationLabel(b.durationMins)} · pickup {b.pickupSuburb}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${STATUS[b.status]}`}>{LABEL[b.status]}</span>
            <Link href={`/booking/${b.manageToken}`} className="btn-outline btn-sm">{b.status === "CONFIRMED" ? "Manage" : "View"}</Link>
            {b.status !== "CANCELLED" && <Link href={`/invoice/${b.manageToken}`} className="btn-ghost btn-sm">Invoice</Link>}
          </div>
        </li>
      ))}
    </ul>
  );
}
