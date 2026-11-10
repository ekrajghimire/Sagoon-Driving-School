"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateSlotPicker, type SlotChoice } from "@/components/DateSlotPicker";
import { rescheduleAsStaff } from "../../actions/bookings";

export function RescheduleBox({ id, durationMins, maxAdvanceDays }: { id: string; durationMins: number; maxAdvanceDays: number }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<SlotChoice>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <button className="btn-outline btn-sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? "Close reschedule" : "Reschedule"}
      </button>
      {msg && <p role="status" className={`mt-2 text-sm font-semibold ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
      {open && (
        <div className="mt-3 rounded-xl border border-line p-4">
          <DateSlotPicker durationMins={durationMins} value={slot} onChange={setSlot} maxAdvanceDays={maxAdvanceDays} />
          <button
            className="btn-primary btn-sm mt-4"
            disabled={!slot || pending}
            onClick={() =>
              start(async () => {
                const r = await rescheduleAsStaff(id, slot!.date, slot!.startMin);
                setMsg(r.ok ? { ok: true, text: r.message ?? "Rescheduled" } : { ok: false, text: r.error ?? "Failed" });
                if (r.ok) {
                  setOpen(false);
                  setSlot(null);
                  router.refresh();
                }
              })
            }
          >
            {pending ? "Saving…" : slot ? `Move to ${slot.date} ${slot.label}` : "Pick a new time"}
          </button>
          <p className="help">Staff can only reschedule into genuinely free times. Need an out-of-hours slot? Cancel and create a manual booking with “staff override”.</p>
        </div>
      )}
    </div>
  );
}
