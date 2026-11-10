"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, X, Check } from "lucide-react";

/** A chosen time. `label` is the range shown to people, e.g. "8:00 AM – 9:00 AM". */
export type SlotChoice = { date: string; startMin: number; label: string } | null;
export type Pick = NonNullable<SlotChoice>;
type TimeOpt = { startMin: number; label: string; range?: string; available: boolean; reason?: "booked" | "too_soon" };

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
export function longDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}
export function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/**
 * Month calendar + time grid.
 * - Single mode: `value` / `onChange` (one start time).
 * - Multi mode: `picks` / `onPicksChange` / `maxPicks` — e.g. a 2-hour lesson as two 1-hour sessions,
 *   on the same day or different days. Back-to-back picks are fine; overlapping or too-close picks are disabled.
 */
export function DateSlotPicker({
  durationMins,
  value = null,
  onChange,
  picks,
  onPicksChange,
  maxPicks = 1,
  bufferMins = 15,
  maxAdvanceDays = 60,
  manageToken,
  initialDate,
  onNoSlots,
}: {
  durationMins: number;
  value?: SlotChoice;
  onChange?: (v: SlotChoice) => void;
  picks?: Pick[];
  onPicksChange?: (p: Pick[]) => void;
  maxPicks?: number;
  bufferMins?: number;
  maxAdvanceDays?: number;
  manageToken?: string;
  initialDate?: string;
  onNoSlots?: (date: string | null) => void;
}) {
  const multi = Boolean(onPicksChange);
  const chosen: Pick[] = multi ? (picks ?? []) : value ? [value] : [];

  const today = sydneyToday();
  const [ty, tm] = today.split("-").map(Number);
  const [view, setView] = useState(() => {
    const d = initialDate ?? chosen[0]?.date ?? today;
    const [y, m] = d.split("-").map(Number);
    return { y, m: m - 1 };
  });
  const [date, setDate] = useState<string | null>(initialDate ?? chosen[0]?.date ?? null);
  // Results are stored with the request key they belong to; "loading" = no result for the current key yet.
  const [month, setMonth] = useState<{ key: string; counts: Record<string, number> }>({ key: "", counts: {} });
  const [day, setDay] = useState<{ key: string; slots: TimeOpt[]; error: string | null }>({ key: "", slots: [], error: null });
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
          slots: (d.grid as TimeOpt[] | undefined) ?? (d.slots ?? []).map((s: TimeOpt) => ({ ...s, available: true })),
          error: d.calendarOk === false ? "Live calendar check is temporarily unavailable — times will be re-checked when you confirm." : null,
        });
        // Waitlist only makes sense for open-but-full days, not closed days (empty grid).
        const open = ((d.grid as TimeOpt[] | undefined) ?? d.slots ?? []).length > 0;
        onNoSlots?.(open && !d.slots?.length ? date : null);
      })
      .catch((e) => e.name !== "AbortError" && setDay({ key, slots: [], error: "Couldn't load times. Please try again." }));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onNoSlots is a callback prop; re-running on its identity would refetch
  }, [date, durationMins, manageToken, dayKey]);

  const canPrev = view.y > ty || (view.y === ty && view.m > tm - 1);
  const lastView = lastBookable.split("-").map(Number);
  const canNext = view.y < lastView[0] || (view.y === lastView[0] && view.m < lastView[1] - 1);
  const monthLabel = new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" });
  const full = multi && chosen.length >= maxPicks;

  /** Why a free time can't be added next to the current picks (multi mode), or null if it can. */
  function conflictWithPicks(d: string, startMin: number): string | null {
    for (const p of chosen) {
      if (p.date !== d || p.startMin === startMin) continue;
      const aEnd = p.startMin + durationMins;
      const bEnd = startMin + durationMins;
      if (startMin < aEnd && bEnd > p.startMin) return "Overlaps your pick";
      const gap = startMin >= aEnd ? startMin - aEnd : p.startMin - bEnd;
      if (gap > 0 && gap < bufferMins) return "Too close to your pick";
    }
    return null;
  }

  function choose(t: TimeOpt) {
    if (!date) return;
    const pick: Pick = { date, startMin: t.startMin, label: t.range ?? t.label };
    if (!multi) return onChange?.(pick);
    const exists = chosen.some((p) => p.date === date && p.startMin === t.startMin);
    if (exists) return onPicksChange!(chosen.filter((p) => !(p.date === date && p.startMin === t.startMin)));
    if (full) return;
    onPicksChange!([...chosen, pick].sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1)));
  }

  const pickedDates = new Set(chosen.map((p) => p.date));

  return (
    <div>
      {multi && (
        <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50/60 p-3 sm:p-4" aria-live="polite">
          <p className="text-sm font-semibold">
            {chosen.length < maxPicks
              ? `Choose ${maxPicks} one-hour times — ${chosen.length} of ${maxPicks} picked. Same day or different days, it's up to you.`
              : `All ${maxPicks} times picked. Tap a time again to remove it.`}
          </p>
          {chosen.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {chosen.map((p, i) => (
                <li key={`${p.date}-${p.startMin}`}>
                  <button
                    type="button"
                    onClick={() => onPicksChange!(chosen.filter((_, j) => j !== i))}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 shadow-sm transition hover:border-danger hover:text-danger"
                    aria-label={`Remove ${shortDate(p.date)} ${p.label}`}
                  >
                    <span className="grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] text-white group-hover:bg-danger">{i + 1}</span>
                    {shortDate(p.date)} · {p.label}
                    <X className="size-3.5 opacity-60 group-hover:opacity-100" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
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
              const hasPick = pickedDates.has(d);
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!inRange}
                  onClick={() => {
                    setDate(d);
                    if (!multi) onChange?.(null);
                  }}
                  aria-pressed={selected}
                  aria-label={`${longDate(d)}${inRange ? (n === undefined ? "" : n > 0 ? `, ${n} times available` : ", fully booked") : ", unavailable"}${hasPick ? ", has your pick" : ""}`}
                  className={[
                    "relative aspect-square rounded-lg text-sm font-semibold transition duration-150",
                    selected
                      ? "bg-brand-700 text-white shadow-md"
                      : open
                        ? "bg-brand-50 text-brand-800 hover:-translate-y-0.5 hover:bg-brand-100 hover:shadow-sm"
                        : inRange
                          ? "bg-surface text-muted line-through decoration-1"
                          : "cursor-default text-slate-300",
                    hasPick && !selected ? "ring-2 ring-accent ring-offset-1" : "",
                  ].join(" ")}
                >
                  {Number(d.slice(8))}
                  {open && !selected && <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-ok" aria-hidden />}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-ok" /> Times available</span>
            <span><span className="line-through">12</span> Fully booked / closed</span>
            {multi && <span className="inline-flex items-center gap-1"><span className="size-3 rounded ring-2 ring-accent" /> Has your pick</span>}
          </p>
        </div>

        <div>
          {!date ? (
            <p className="rounded-xl bg-surface p-6 text-center text-muted">Pick a date to see available times.</p>
          ) : (
            <>
              <p className="mb-3 font-bold">{longDate(date)}</p>
              {error && <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm">{error}</p>}
              {loadingSlots ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Checking live availability" role="status">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-xl bg-surface" />
                  ))}
                </div>
              ) : slots && slots.length ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role={multi ? "group" : "radiogroup"} aria-label="Times">
                    {slots.map((s) => {
                      const sel = chosen.some((p) => p.date === date && p.startMin === s.startMin);
                      const clash = s.available && !sel && multi ? conflictWithPicks(date, s.startMin) : null;
                      const blocked = !s.available || Boolean(clash) || (full && !sel);
                      const why = !s.available ? (s.reason === "too_soon" ? "Call us" : "Booked") : clash ? "Clashes" : "";
                      const text = s.range ?? s.label;
                      return (
                        <button
                          key={s.startMin}
                          type="button"
                          role={multi ? undefined : "radio"}
                          aria-checked={multi ? undefined : sel}
                          aria-pressed={multi ? sel : undefined}
                          disabled={blocked && !sel}
                          aria-label={!s.available || clash ? `${text}, not available (${why.toLowerCase()})` : text}
                          title={
                            !s.available
                              ? s.reason === "too_soon"
                                ? "Too soon to book online — please call us"
                                : "Already taken"
                              : clash ?? (full && !sel ? `You've picked ${maxPicks} times — remove one to change` : undefined)
                          }
                          onClick={() => choose(s)}
                          className={[
                            "relative flex min-h-12 flex-col items-center justify-center rounded-xl border px-1.5 text-[12px] font-semibold leading-tight transition duration-150 min-[400px]:text-[13px]",
                            sel
                              ? "border-brand-700 bg-brand-700 text-white shadow-md"
                              : !s.available || clash
                                ? "cursor-not-allowed border-line bg-surface text-slate-400"
                                : full
                                  ? "cursor-not-allowed border-line bg-white text-slate-400"
                                  : "border-line bg-white hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-50 hover:shadow-sm active:translate-y-0",
                          ].join(" ")}
                        >
                          {sel && <Check className="absolute right-1.5 top-1.5 size-3.5" aria-hidden />}
                          <span className={`whitespace-nowrap tracking-tight ${!s.available || clash ? "line-through" : ""}`}>{text}</span>
                          {why && <span className="text-[10px] font-medium uppercase tracking-wide">{why}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {!slots.some((s) => s.available) && (
                    <p className="mt-3 rounded-xl bg-surface p-4 text-sm text-muted">This day is fully booked. Try another day{onNoSlots ? ", or join the waitlist below" : ""}.</p>
                  )}
                </>
              ) : (
                <p className="rounded-xl bg-surface p-4 text-sm text-muted">We&apos;re closed on this day. Please pick another date.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
