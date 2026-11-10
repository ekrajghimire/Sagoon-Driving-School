"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { DateSlotPicker, type SlotChoice } from "@/components/DateSlotPicker";
import { rescheduleAsStaff } from "../../actions/bookings";

const prettyDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

export function RescheduleBox({ id, durationMins, maxAdvanceDays }: { id: string; durationMins: number; maxAdvanceDays: number }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<SlotChoice>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function confirmMove() {
    if (!slot) return;
    if (!window.confirm(`Move this lesson to ${prettyDate(slot.date)} at ${slot.label}? The customer will be emailed.`)) return;
    setMsg(null);
    start(async () => {
      const r = await rescheduleAsStaff(id, slot.date, slot.startMin);
      setMsg(r.ok ? { ok: true, text: r.message ?? "Rescheduled" } : { ok: false, text: r.error ?? "Couldn't reschedule. Please try again." });
      if (r.ok) {
        setOpen(false);
        setSlot(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <button type="button" className="btn-outline btn-sm w-full" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalendarClock className="size-4" aria-hidden /> {open ? "Close reschedule" : "Reschedule"}
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 flex items-start gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-green-50 text-ok" : "bg-red-50 text-danger"}`}>
          {msg.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
          {msg.text}
        </p>
      )}
      {open && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <DateSlotPicker durationMins={durationMins} value={slot} onChange={setSlot} maxAdvanceDays={maxAdvanceDays} />
          <button type="button" className="btn-primary btn-sm mt-4 w-full" disabled={!slot || pending} aria-busy={pending} onClick={confirmMove}>
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {pending ? "Moving…" : slot ? `Move to ${prettyDate(slot.date)}, ${slot.label}` : "Pick a new time"}
          </button>
          <p className="help">Only genuinely free times are shown. Need an out-of-hours slot? Cancel and create a manual booking with “staff override”.</p>
        </div>
      )}
    </div>
  );
}
