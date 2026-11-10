"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DateSlotPicker, type SlotChoice } from "@/components/DateSlotPicker";
import { cancelByToken, rescheduleByToken } from "./actions";

export function ManageBooking({ token, durationMins, canChange, windowHours, maxAdvanceDays }: { token: string; durationMins: number; canChange: boolean; windowHours: number; maxAdvanceDays: number }) {
  const [mode, setMode] = useState<"none" | "reschedule" | "cancel">("none");
  const [slot, setSlot] = useState<SlotChoice>(null);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!canChange) {
    return (
      <p className="rounded-xl bg-amber-50 p-4 text-sm">
        Online changes close {windowHours} hours before the lesson. Need to change something? Please call or text us.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {msg && <p role="status" className={`rounded-xl p-3 text-sm font-semibold ${msg.ok ? "bg-green-50 text-ok" : "bg-red-50 text-danger"}`}>{msg.text}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-outline" aria-expanded={mode === "reschedule"} onClick={() => setMode(mode === "reschedule" ? "none" : "reschedule")}>Reschedule</button>
        <button className="btn-danger" aria-expanded={mode === "cancel"} onClick={() => setMode(mode === "cancel" ? "none" : "cancel")}>Cancel lesson</button>
      </div>

      {mode === "reschedule" && (
        <div className="rounded-xl border border-line p-4">
          <DateSlotPicker durationMins={durationMins} value={slot} onChange={setSlot} manageToken={token} maxAdvanceDays={maxAdvanceDays} />
          <button
            className="btn-primary mt-4"
            disabled={!slot || pending}
            onClick={() =>
              start(async () => {
                const r = await rescheduleByToken(token, slot!.date, slot!.startMin);
                setMsg(r.ok ? { ok: true, text: "Done! Your lesson has been moved and a new confirmation emailed." } : { ok: false, text: r.error! });
                if (r.ok) { setMode("none"); router.refresh(); }
              })
            }
          >
            {pending ? "Saving…" : slot ? `Move to ${slot.label}` : "Choose a new time"}
          </button>
        </div>
      )}

      {mode === "cancel" && (
        <div className="rounded-xl border border-red-200 p-4">
          <label htmlFor="reason" className="label">Reason (optional)</label>
          <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. sick, exam clash" />
          <button
            className="btn-danger mt-3"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await cancelByToken(token, reason);
                setMsg(r.ok ? { ok: true, text: "Your lesson has been cancelled. Any package credit has been returned." } : { ok: false, text: r.error! });
                if (r.ok) { setMode("none"); router.refresh(); }
              })
            }
          >
            {pending ? "Cancelling…" : "Yes, cancel this lesson"}
          </button>
        </div>
      )}
    </div>
  );
}
