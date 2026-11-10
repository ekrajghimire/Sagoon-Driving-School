"use client";
import { useState } from "react";
import { addBlockedTime } from "../actions/availability";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";

export function BlockTimeForm({ today }: { today: string }) {
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState(today);
  return (
    <ActionForm action={addBlockedTime} className="mt-3 grid gap-3 sm:grid-cols-6" resetOnSuccess>
      <label className="label sm:col-span-2">
        From date
        <input name="date" type="date" required min={today} value={from} onChange={(e) => setFrom(e.target.value)} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        To date <span className="font-normal text-muted">(if more than one day)</span>
        <input name="endDate" type="date" min={from || today} className="input mt-1" />
      </label>
      <label className="flex min-h-11 items-center gap-2 self-end text-sm sm:col-span-2">
        <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-5" /> All day
      </label>
      {!allDay && (
        <>
          <label className="label sm:col-span-2">
            Start time
            <input name="start" type="time" step={900} required defaultValue="09:00" className="input mt-1" />
          </label>
          <label className="label sm:col-span-2">
            End time
            <input name="end" type="time" step={900} required defaultValue="12:00" className="input mt-1" />
          </label>
        </>
      )}
      <label className={`label ${allDay ? "sm:col-span-6" : "sm:col-span-2"}`}>
        Reason <span className="font-normal text-muted">(private)</span>
        <input name="reason" maxLength={120} className="input mt-1" placeholder="e.g. Car service" />
      </label>
      <div className="sm:col-span-6">
        <SubmitButton>Block time</SubmitButton>
      </div>
    </ActionForm>
  );
}
