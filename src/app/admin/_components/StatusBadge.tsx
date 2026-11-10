/** One colour language across the admin: blue = booked/info, green = done/paid, amber = needs action, red = problem, grey = inactive. */
const STATUS: Record<string, [string, string]> = {
  CONFIRMED: ["Confirmed", "bg-brand-100 text-brand-800"],
  COMPLETED: ["Completed", "bg-green-100 text-ok"],
  CANCELLED: ["Cancelled", "bg-red-100 text-danger"],
  NO_SHOW: ["No-show", "bg-amber-100 text-amber-800"],
  UNPAID: ["Unpaid", "bg-amber-100 text-amber-800"],
  PAID: ["Paid", "bg-green-100 text-ok"],
  CREDIT: ["Package credit", "bg-brand-100 text-brand-800"],
  REFUNDED: ["Refunded", "bg-slate-200 text-slate-700"],
  FREE: ["No charge", "bg-slate-100 text-slate-700"],
  PENDING_PAYMENT: ["Payment due", "bg-amber-100 text-amber-800"],
  SYNCED: ["Calendar ✓", "bg-green-100 text-ok"],
  FAILED: ["Calendar sync failed", "bg-red-100 text-danger"],
  PENDING: ["Calendar pending", "bg-slate-100 text-slate-700"],
  NOT_CONFIGURED: ["Calendar off", "bg-slate-100 text-slate-500"],
  // Generic content / promo states
  LIVE: ["Live", "bg-green-100 text-ok"],
  DRAFT: ["Draft", "bg-slate-100 text-slate-600"],
  HIDDEN: ["Hidden", "bg-slate-100 text-slate-600"],
  ACTIVE: ["Active", "bg-green-100 text-ok"],
  INACTIVE: ["Inactive", "bg-slate-200 text-slate-600"],
  EXPIRED: ["Expired", "bg-slate-200 text-slate-600"],
  USED_UP: ["Used up", "bg-slate-200 text-slate-600"],
  NEW: ["New", "bg-accent text-ink"],
  HANDLED: ["Handled", "bg-slate-100 text-slate-600"],
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const [label, cls] = STATUS[status] ?? [status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " "), "bg-slate-100 text-slate-700"];
  return <span className={`badge whitespace-nowrap ${cls} ${className}`}>{label}</span>;
}

/** Shown on bookings that are one half of a 2-hour lesson split into two 1-hour parts. */
export function SplitBadge() {
  return <span className="badge whitespace-nowrap bg-violet-100 text-violet-800">Part of split lesson</span>;
}

/** True when a booking is one part of a split lesson (`groupRef` is optional until the schema has it). */
export function isSplit(b: object) {
  return Boolean((b as { groupRef?: string | null }).groupRef);
}
