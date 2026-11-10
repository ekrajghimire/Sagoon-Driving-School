"use client";
import { useState } from "react";
import { saveWorkingHours } from "../actions/availability";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
type Range = { weekday: number; start: string; end: string };

export function WorkingHoursEditor({ initial }: { initial: Range[] }) {
  const [rows, setRows] = useState<Range[]>(initial);
  const update = (i: number, k: "start" | "end", v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <ActionForm action={saveWorkingHours}>
      <input type="hidden" name="hours" value={JSON.stringify(rows)} />
      <div className="divide-y divide-line">
        {ORDER.map((wd) => {
          const day = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === wd);
          return (
            <div key={wd} className="flex flex-wrap items-center gap-3 py-3">
              <p className="w-28 font-semibold">{DAYS[wd]}</p>
              <div className="flex flex-1 flex-col gap-2">
                {day.length === 0 && <p className="text-sm text-muted">Closed</p>}
                {day.map(({ r, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`s-${i}`}>{DAYS[wd]} start</label>
                    <input id={`s-${i}`} type="time" step={900} value={r.start} onChange={(e) => update(i, "start", e.target.value)} className="input w-32" />
                    <span aria-hidden>–</span>
                    <label className="sr-only" htmlFor={`e-${i}`}>{DAYS[wd]} end</label>
                    <input id={`e-${i}`} type="time" step={900} value={r.end} onChange={(e) => update(i, "end", e.target.value)} className="input w-32" />
                    <button type="button" className="btn-ghost btn-sm" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${DAYS[wd]} range`}>Remove</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-outline btn-sm" onClick={() => setRows((x) => [...x, { weekday: wd, start: "09:00", end: "17:00" }])}>+ Add hours</button>
            </div>
          );
        })}
      </div>
      <SubmitButton className="btn-brand mt-4">Save working hours</SubmitButton>
    </ActionForm>
  );
}
