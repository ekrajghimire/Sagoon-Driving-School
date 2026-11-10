"use client";
import { useRef, useState, useTransition } from "react";
import { CircleAlert, LoaderCircle, Search, X } from "lucide-react";
import { DateSlotPicker, type SlotChoice } from "@/components/DateSlotPicker";
import { aud } from "@/lib/money";
import { createManualBooking, searchCustomers, type CustomerHit } from "../../actions/bookings";

type LT = { id: string; name: string; durationMins: number; priceCents: number };
type Mode = "lesson" | "custom" | "credit";

const pill = (on: boolean) =>
  `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${on ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:border-brand-500"}`;
const prettyDate = (iso: string) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "";

export function ManualBookingForm({
  lessonTypes,
  suburbs,
  maxAdvanceDays,
  today,
  initialCustomer,
}: {
  lessonTypes: LT[];
  suburbs: string[];
  maxAdvanceDays: number;
  today: string;
  initialCustomer?: (CustomerHit & { pickupAddress?: string; pickupSuburb?: string }) | null;
}) {
  const [mode, setMode] = useState<Mode>("lesson");
  const [lessonTypeId, setLessonTypeId] = useState(lessonTypes[0]?.id ?? "");
  const [custom, setCustom] = useState({ title: "Driving lesson", duration: 60, price: "75" });
  const [timing, setTiming] = useState<"slot" | "override">("slot");
  const [slot, setSlot] = useState<SlotChoice>(null);
  const [ov, setOv] = useState({ date: "", time: "" });
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [customer, setCustomer] = useState<CustomerHit | null>(initialCustomer ?? null);
  const [f, setF] = useState({
    customerName: initialCustomer?.name ?? "",
    customerEmail: initialCustomer?.email ?? "",
    customerPhone: initialCustomer?.phone ?? "",
    pickupAddress: initialCustomer?.pickupAddress ?? "",
    pickupSuburb: initialCustomer?.pickupSuburb ?? "",
    customerNotes: "",
    promoCode: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [searching, startSearch] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  function onSearch(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      setSearched(false);
      return;
    }
    const mine = ++seq.current;
    timer.current = setTimeout(
      () =>
        startSearch(async () => {
          const r = await searchCustomers(value);
          // Ignore stale responses that arrive after a newer keystroke.
          if (mine === seq.current) {
            setHits(r);
            setSearched(true);
          }
        }),
      250,
    );
  }

  const lt = lessonTypes.find((l) => l.id === lessonTypeId);
  // Credit lessons last as long as the customer's package lessons (same rule the server uses).
  const duration = mode === "custom" ? custom.duration : mode === "credit" ? customer?.creditDurationMins ?? 60 : lt?.durationMins ?? 60;
  const priceLabel = mode === "credit" ? "Package credit" : mode === "custom" ? (custom.price ? `$${custom.price}` : "$0") : lt ? aud(lt.priceCents) : "—";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const whenLabel = timing === "slot" ? (slot ? `${prettyDate(slot.date)}, ${slot.label}` : null) : ov.date && ov.time ? `${prettyDate(ov.date)}, ${ov.time}` : null;
  const overridePast = timing === "override" && ov.date && ov.date < today;

  function pick(c: CustomerHit) {
    setCustomer(c);
    setF((s) => ({ ...s, customerName: c.name, customerEmail: c.email, customerPhone: c.phone || s.customerPhone }));
    setHits([]);
    setSearched(false);
    setQ("");
  }

  function unlink() {
    setCustomer(null);
    if (mode === "credit") {
      setMode("lesson");
      setSlot(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!whenLabel) {
      setError("Choose a date and start time.");
      return;
    }
    start(async () => {
      const res = await createManualBooking({
        mode,
        lessonTypeId: mode === "lesson" ? lessonTypeId : undefined,
        customTitle: mode === "custom" ? custom.title : undefined,
        customDuration: mode === "custom" ? Number(custom.duration) : undefined,
        customPrice: mode === "custom" ? custom.price : undefined,
        timing,
        date: timing === "slot" ? slot?.date ?? "" : ov.date,
        startMin: timing === "slot" ? slot?.startMin : undefined,
        time: timing === "override" ? ov.time : undefined,
        userId: customer?.id ?? null,
        ...f,
        promoCode: mode === "credit" ? "" : f.promoCode,
      });
      // On success the server redirects to the new booking; we only get here on error.
      if (res?.error) {
        setError(res.error);
        requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 pb-4">
      {error && (
        <p ref={errorRef} role="alert" tabIndex={-1} className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <section className="card space-y-4">
        <h2 className="font-bold">1. Customer</h2>
        {customer ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm">
            <span>
              Linked to account <strong>{customer.name}</strong>
              {customer.credits > 0 && <span className="badge ml-2 bg-brand-100 text-brand-800">{customer.credits} credit{customer.credits === 1 ? "" : "s"}</span>}
            </span>
            <button type="button" className="btn-ghost btn-sm" onClick={unlink}>
              <X className="size-4" aria-hidden /> Unlink
            </button>
          </div>
        ) : (
          <div className="relative">
            <label className="label" htmlFor="cs">Find a registered customer <span className="font-normal text-muted">(optional)</span></label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="cs"
                type="search"
                className="input pl-9"
                value={q}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search name, email or phone"
                autoComplete="off"
                aria-controls="cs-results"
              />
              {searching && <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" aria-hidden />}
            </div>
            {(hits.length > 0 || (searched && q.trim().length >= 2)) && (
              <ul id="cs-results" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-white shadow-lg">
                {hits.map((h) => (
                  <li key={h.id}>
                    <button type="button" className="block min-h-12 w-full px-3 py-2 text-left text-sm transition hover:bg-brand-50 active:bg-brand-100" onClick={() => pick(h)}>
                      <strong>{h.name}</strong>
                      {h.credits > 0 && <span className="badge ml-2 bg-brand-100 text-brand-800">{h.credits} credits</span>}
                      <span className="block text-xs text-muted">
                        {h.email}
                        {h.phone && ` · ${h.phone}`}
                      </span>
                    </button>
                  </li>
                ))}
                {hits.length === 0 && <li className="px-3 py-3 text-sm text-muted">No registered customer found — just fill in their details below.</li>}
              </ul>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="n">Name</label>
            <input id="n" className="input" required minLength={2} maxLength={100} autoComplete="off" value={f.customerName} onChange={set("customerName")} />
          </div>
          <div>
            <label className="label" htmlFor="p">Phone</label>
            <input id="p" type="tel" inputMode="tel" className="input" required minLength={8} maxLength={30} value={f.customerPhone} onChange={set("customerPhone")} />
          </div>
          <div>
            <label className="label" htmlFor="e">
              Email <span className="font-normal text-muted">(for confirmation)</span>
            </label>
            <input id="e" type="email" inputMode="email" className="input" value={f.customerEmail} onChange={set("customerEmail")} />
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">2. Lesson</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lesson type">
          {(["lesson", "custom", ...(customer && customer.credits > 0 ? ["credit"] : [])] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => {
                setMode(m);
                setSlot(null);
              }}
              className={pill(mode === m)}
            >
              {m === "lesson" ? "Standard lesson" : m === "custom" ? "Custom" : `Use package credit (${customer?.credits})`}
            </button>
          ))}
        </div>
        {mode === "lesson" &&
          (lessonTypes.length ? (
            <div>
              <label className="label" htmlFor="lt">Lesson type</label>
              <select
                id="lt"
                className="input"
                value={lessonTypeId}
                onChange={(e) => {
                  setLessonTypeId(e.target.value);
                  setSlot(null);
                }}
              >
                {lessonTypes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.durationMins} min — {aud(l.priceCents)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">No active lesson types. Add one in Pricing, or use “Custom”.</p>
          ))}
        {mode === "custom" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="ct">Title</label>
              <input id="ct" className="input" required maxLength={100} value={custom.title} onChange={(e) => setCustom((c) => ({ ...c, title: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="cd">Duration (minutes)</label>
              <input
                id="cd"
                type="number"
                inputMode="numeric"
                min={30}
                max={240}
                step={15}
                required
                className="input"
                value={custom.duration || ""}
                onChange={(e) => {
                  setCustom((c) => ({ ...c, duration: Number(e.target.value) }));
                  setSlot(null);
                }}
              />
            </div>
            <div>
              <label className="label" htmlFor="cp">Price incl. GST ($)</label>
              <input id="cp" inputMode="decimal" pattern="\d+(\.\d{1,2})?" title="Dollars, e.g. 75 or 75.50" className="input" value={custom.price} onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} />
            </div>
          </div>
        )}
        {mode === "credit" && <p className="text-sm text-muted">Uses one credit from their oldest package ({duration} min lesson). No payment to collect.</p>}
        {mode !== "credit" && (
          <div className="max-w-xs">
            <label className="label" htmlFor="promo">Promo / voucher code <span className="font-normal text-muted">(optional)</span></label>
            <input id="promo" className="input uppercase" autoCapitalize="characters" value={f.promoCode} onChange={set("promoCode")} />
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">3. Date &amp; time</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Timing">
          <button type="button" role="radio" aria-checked={timing === "slot"} onClick={() => setTiming("slot")} className={pill(timing === "slot")}>
            Available slots
          </button>
          <button type="button" role="radio" aria-checked={timing === "override"} onClick={() => setTiming("override")} className={pill(timing === "override")}>
            Staff override: any time
          </button>
        </div>
        {timing === "slot" ? (
          <DateSlotPicker durationMins={duration} value={slot} onChange={setSlot} maxAdvanceDays={maxAdvanceDays} />
        ) : (
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="od">Date</label>
              <input id="od" type="date" className="input" required value={ov.date} onChange={(e) => setOv((o) => ({ ...o, date: e.target.value }))} />
            </div>
            <div>
              <label className="label" htmlFor="ot">Start time</label>
              <input id="ot" type="time" step={300} className="input" required value={ov.time} onChange={(e) => setOv((o) => ({ ...o, time: e.target.value }))} />
            </div>
            {overridePast && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900 sm:col-span-2">That date is in the past — only do this to record a lesson that already happened.</p>}
            <p className="help sm:col-span-2">Ignores working hours, notice and travel buffer — but still refuses any overlap with another lesson or a busy Google Calendar event.</p>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">4. Pickup &amp; notes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sub">Suburb</label>
            <input id="sub" list="admin-suburbs" className="input" required minLength={2} maxLength={60} value={f.pickupSuburb} onChange={set("pickupSuburb")} />
            <datalist id="admin-suburbs">
              {suburbs.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="addr">Street address</label>
            <input id="addr" className="input" required minLength={3} maxLength={200} value={f.pickupAddress} onChange={set("pickupAddress")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="nt">Notes <span className="font-normal text-muted">(the customer sees these as their notes)</span></label>
            <textarea id="nt" rows={2} maxLength={1000} className="input" value={f.customerNotes} onChange={set("customerNotes")} />
          </div>
        </div>
      </section>

      {/* Sticky summary + submit, always within thumb reach on a phone */}
      <div className="sticky bottom-16 z-20 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-bold">{whenLabel ?? <span className="text-muted">No time chosen yet</span>}</p>
            <p className="truncate text-muted">
              {duration} min · {priceLabel}
            </p>
          </div>
          <button className="btn-primary shrink-0" disabled={pending || !whenLabel} aria-busy={pending}>
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {pending ? "Booking…" : "Create booking"}
          </button>
        </div>
      </div>
    </form>
  );
}
