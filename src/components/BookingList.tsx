import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { fmtDate, fmtRange, durationLabel } from "@/lib/time";

type B = { id: string; ref: string; title: string; startsAt: Date; endsAt: Date; durationMins: number; status: string; manageToken: string; pickupSuburb: string; paymentStatus: string };
const STATUS: Record<string, string> = { CONFIRMED: "bg-green-100 text-ok", COMPLETED: "bg-brand-50 text-brand-800", CANCELLED: "bg-red-100 text-danger", NO_SHOW: "bg-amber-100 text-amber-900" };
const LABEL: Record<string, string> = { CONFIRMED: "Upcoming", COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "Missed" };

export function BookingList({ items, empty }: { items: B[]; empty: React.ReactNode }) {
  if (!items.length) return <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-muted">{empty}</div>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      {items.map((b) => (
        <li key={b.id} className={`flex flex-col gap-3 p-4 transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:justify-between ${b.status === "CANCELLED" ? "opacity-75" : ""}`}>
          <div className="flex min-w-0 gap-3">
            <span aria-hidden className="hidden size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 min-[400px]:grid">
              <CalendarDays className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-bold">
                {fmtDate(b.startsAt)} <span className="font-semibold whitespace-nowrap text-brand-800">· {fmtRange(b.startsAt, b.endsAt)}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {b.title} · {durationLabel(b.durationMins)}{" "}
                <span className="inline-flex items-center gap-0.5 whitespace-nowrap">· <MapPin className="size-3.5" aria-hidden /> pickup {b.pickupSuburb}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:flex-nowrap">
            <span className={`badge ${STATUS[b.status] ?? "bg-surface text-muted"}`}>{LABEL[b.status] ?? b.status}</span>
            <Link href={`/booking/${b.manageToken}`} className="btn-outline btn-sm ml-auto sm:ml-0">
              {b.status === "CONFIRMED" ? "Manage" : "View"}
              <span className="sr-only"> booking {b.ref}</span>
            </Link>
            {b.status !== "CANCELLED" && (
              <Link href={`/invoice/${b.manageToken}`} className="btn-ghost btn-sm">
                Invoice<span className="sr-only"> for booking {b.ref}</span>
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
