"use client";
import { useState } from "react";
import { Plus, X, Copy } from "lucide-react";
import { saveWorkingHours } from "../actions/availability";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
type Range = { weekday: number; start: string; end: string };

/** Problems shown inline as you edit (the server re-checks the same rules). */
function problemsFor(rows: Range[], wd: number) {
  const day = rows.filter((r) => r.weekday === wd).sort((a, b) => a.start.localeCompare(b.start));
  if (day.some((r) => !r.start || !r.end)) return "Enter both a start and end time.";
  if (day.some((r) => r.end <= r.start)) return "End time must be after the start time.";
  for (let i = 1; i < day.length; i++) if (day[i].start < day[i - 1].end) return "These time ranges overlap.";
  return null;
}

export function WorkingHoursEditor({ initial }: { initial: Range[] }) {
  const [rows, setRows] = useState<Range[]>(initial);
  const [dirty, setDirty] = useState(false);
  const edit = (fn: (r: Range[]) => Range[]) => {
    setRows(fn);
    setDirty(true);
  };
  const update = (i: number, k: "start" | "end", v: string) => edit((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const hasProblems = ORDER.some((wd) => problemsFor(rows, wd));

  function copyMondayToWeekdays() {
    const mon = rows.filter((r) => r.weekday === 1);
    edit((r) => [...r.filter((x) => x.weekday < 2 || x.weekday > 5), ...[2, 3, 4, 5].flatMap((wd) => mon.map((m) => ({ ...m, weekday: wd })))]);
  }

  return (
    <ActionForm action={saveWorkingHours} onSuccess={() => setDirty(false)}>
      <input type="hidden" name="hours" value={JSON.stringify(rows)} />
      {rows.some((r) => r.weekday === 1) && (
        <button type="button" className="btn-ghost btn-sm mt-2" onClick={copyMondayToWeekdays}>
          <Copy className="size-4" aria-hidden /> Copy Monday to Tue–Fri
        </button>
      )}
      <div className="mt-2 divide-y divide-line">
        {ORDER.map((wd) => {
          const day = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.weekday === wd);
          const problem = problemsFor(rows, wd);
          return (
            <div key={wd} className="grid gap-2 py-3 sm:grid-cols-[7rem_1fr_auto] sm:items-start">
              <p className="flex min-h-11 items-center font-semibold">
                {DAYS[wd]}
                {day.length === 0 && <span className="ml-2 badge bg-slate-100 text-slate-600 sm:hidden">Closed</span>}
              </p>
              <div className="flex flex-col gap-2">
                {day.length === 0 && <p className="hidden min-h-11 items-center text-sm text-muted sm:flex">Closed</p>}
                {day.map(({ r, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`s-${i}`}>{DAYS[wd]} start</label>
                    <input id={`s-${i}`} type="time" step={900} required value={r.start} onChange={(e) => update(i, "start", e.target.value)} className="input w-full min-w-0 sm:w-36" />
                    <span aria-hidden className="text-muted">–</span>
                    <label className="sr-only" htmlFor={`e-${i}`}>{DAYS[wd]} end</label>
                    <input id={`e-${i}`} type="time" step={900} required value={r.end} onChange={(e) => update(i, "end", e.target.value)} className="input w-full min-w-0 sm:w-36" />
                    <button type="button" className="btn-ghost btn-sm shrink-0 px-2" onClick={() => edit((x) => x.filter((_, j) => j !== i))} aria-label={`Remove ${DAYS[wd]} ${r.start}–${r.end}`}>
                      <X className="size-5" aria-hidden />
                    </button>
                  </div>
                ))}
                {problem && <p className="text-sm font-semibold text-danger" role="alert">{problem}</p>}
              </div>
              <button
                type="button"
                className="btn-outline btn-sm justify-self-start"
                onClick={() => {
                  const last = day.at(-1)?.r;
                  // A second block defaults to after the first one, e.g. an afternoon session after a lunch break.
                  const next = last && last.end < "21:00" ? { start: last.end, end: last.end < "17:00" ? "17:00" : "21:00" } : { start: "09:00", end: "17:00" };
                  edit((x) => [...x, { weekday: wd, ...next }]);
                }}
              >
                <Plus className="size-4" aria-hidden /> {day.length ? "Add hours" : "Open this day"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-16 z-10 -mx-5 mt-2 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0">
        <SubmitButton className="btn-brand">Save working hours</SubmitButton>
        {hasProblems ? (
          <span className="text-sm font-semibold text-danger">Fix the highlighted days first.</span>
        ) : (
          dirty && <span className="text-sm font-semibold text-amber-700">Unsaved changes</span>
        )}
      </div>
    </ActionForm>
  );
}
