"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

export type SlotChoice = { date: string; startMin: number; label: string } | null;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

function sydneyToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function longDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

export function DateSlotPicker({
  durationMins,
  value,
  onChange,
  maxAdvanceDays = 60,
  manageToken,
  initialDate,
  onNoSlots,
}: {
  durationMins: number;
  value: SlotChoice;
  onChange: (v: SlotChoice) => void;
  maxAdvanceDays?: number;
  manageToken?: string;
  initialDate?: string;
  onNoSlots?: (date: string | null) => void;
}) {
  const today = sydneyToday();
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState(() => {
    const d = initialDate ?? value?.date ?? today;
    const [y, m] = d.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [date, setDate] = useState<string | null>(initialDate ?? value?.date ?? null);
  // Results are stored with the request key they belong to; "loading" = no result for the current key yet.
  const [month, setMonth] = useState<{ key: string; counts: Record<string, number> }>({ key: "", counts: {} });
  const [day, setDay] = useState<{ key: string; slots: { startMin: number; label: string }[]; error: string | null }>({ key: "", slots: [], error: null });
  const monthKey = `${view.y}-${view.m}-${durationMins}-${manageToken ?? ""}`;
  const dayKey = `${date}-${durationMins}-${manageToken ?? ""}`;
  const counts = month.counts;
  const loadingMonth = month.key !== monthKey;
  const loadingSlots = Boolean(date) && day.key !== dayKey;
  const slots = day.key === dayKey ? day.slots : null;
  const error = day.key === dayKey ? day.error : null;

  // Calendar grid: weeks start Monday.
  const grid = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const cells: (string | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(iso(view.y, view.m, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [view]);

  const lastBookable = addDays(today, maxAdvanceDays);

  useEffect(() => {
    const from = iso(view.y, view.m, 1);
    const ctrl = new AbortController();
    const key = monthKey;
    fetch(`/api/availability/month?from=${from}&days=41&duration=${durationMins}${manageToken ? `&manage=${encodeURIComponent(manageToken)}` : ""}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setMonth({ key, counts: d.counts ?? {} }))
      .catch((e) => e.name !== "AbortError" && setMonth({ key, counts: {} }));
    return () => ctrl.abort();
  }, [view, durationMins, manageToken, monthKey]);

  useEffect(() => {
    if (!date) return;
    const ctrl = new AbortController();
    const key = dayKey;
    const q = new URLSearchParams({ date, duration: String(durationMins) });
    if (manageToken) q.set("manage", manageToken);
    fetch(`/api/availability?${q}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setDay({
          key,
          slots: d.slots ?? [],
          error: d.calendarOk === false ? "Live calendar check is temporarily unavailable — times will be re-checked when you confirm." : null,
        });
        onNoSlots?.(d.slots?.length ? null : date);
      })
      .catch((e) => e.name !== "AbortError" && setDay({ key, slots: [], error: "Couldn't load times. Please try again." }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNoSlots is a callback prop; re-running on its identity would refetch
  }, [date, durationMins, manageToken, dayKey]);

  const canPrev = view.y > ty || (view.y === ty && view.m > tm - 1);
  const lastView = lastBookable.split("-").map(Number);
  const canNext = view.y < lastView[0] || (view.y === lastView[0] && view.m < lastView[1] - 1);
  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="btn-ghost btn-sm" disabled={!canPrev} onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))} aria-label="Previous month">
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-bold" aria-live="polite">
            {monthLabel} {loadingMonth && <Loader2 className="ml-1 inline size-4 animate-spin" aria-label="Loading" />}
          </p>
          <button type="button" className="btn-ghost btn-sm" disabled={!canNext} onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))} aria-label="Next month">
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted" aria-hidden>
          {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label="Choose a date">
          {grid.map((d, i) => {
            if (!d) return <div key={i} />;
            const inRange = d >= today && d <= lastBookable;
            const n = counts[d];
            const open = inRange && (n ?? 0) > 0;
            const selected = d === date;
            return (
              <button
                key={d}
                type="button"
                disabled={!inRange}
                onClick={() => { setDate(d); onChange(null); }}
                aria-pressed={selected}
                aria-label={`${longDate(d)}${inRange ? (n === undefined ? "" : n > 0 ? `, ${n} times available` : ", fully booked") : ", unavailable"}`}
                className={[
                  "relative aspect-square rounded-lg text-sm font-semibold transition",
                  selected ? "bg-brand-700 text-white" : open ? "bg-brand-50 text-brand-800 hover:bg-brand-100" : inRange ? "bg-surface text-muted line-through decoration-1" : "text-slate-300",
                ].join(" ")}
              >
                {Number(d.slice(8))}
                {open && !selected && <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-ok" aria-hidden />}
              </button>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-ok" /> Times available</span>
          <span className="line-through">12</span> Fully booked / closed
        </p>
      </div>

      <div>
        {!date ? (
          <p className="rounded-xl bg-surface p-6 text-center text-muted">Pick a date to see available start times.</p>
        ) : (
          <>
            <p className="mb-3 font-bold">{longDate(date)}</p>
            {error && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm">{error}</p>}
            {loadingSlots ? (
              <p className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" /> Checking live availability…</p>
            ) : slots && slots.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Start time">
                {slots.map((s) => {
                  const sel = value?.date === date && value.startMin === s.startMin;
                  return (
                    <button
                      key={s.startMin}
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => onChange({ date, startMin: s.startMin, label: s.label })}
                      className={`min-h-11 rounded-xl border text-sm font-semibold ${sel ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:border-brand-500"}`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl bg-surface p-4 text-sm text-muted">No times left on this day for a lesson of this length. Try another day{onNoSlots ? ", or join the waitlist below" : ""}.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
