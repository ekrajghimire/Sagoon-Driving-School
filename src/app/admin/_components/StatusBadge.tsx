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
};

export function StatusBadge({ status }: { status: string }) {
  const [label, cls] = STATUS[status] ?? [status, "bg-slate-100 text-slate-700"];
  return <span className={`badge ${cls}`}>{label}</span>;
}
