"use client";
import { useRef, useState, useTransition } from "react";
import { DateSlotPicker, type SlotChoice } from "@/components/DateSlotPicker";
import { createManualBooking, searchCustomers, type CustomerHit } from "../../actions/bookings";

type LT = { id: string; name: string; durationMins: number; priceCents: number };
const aud = (c: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);

export function ManualBookingForm({ lessonTypes, suburbs, maxAdvanceDays }: { lessonTypes: LT[]; suburbs: string[]; maxAdvanceDays: number }) {
  const [mode, setMode] = useState<"lesson" | "custom" | "credit">("lesson");
  const [lessonTypeId, setLessonTypeId] = useState(lessonTypes[0]?.id ?? "");
  const [custom, setCustom] = useState({ title: "Driving lesson", duration: 60, price: "75" });
  const [timing, setTiming] = useState<"slot" | "override">("slot");
  const [slot, setSlot] = useState<SlotChoice>(null);
  const [ov, setOv] = useState({ date: "", time: "" });
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [customer, setCustomer] = useState<CustomerHit | null>(null);
  const [f, setF] = useState({ customerName: "", customerEmail: "", customerPhone: "", pickupAddress: "", pickupSuburb: "", customerNotes: "", promoCode: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [, startSearch] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function onSearch(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(() => startSearch(async () => setHits(await searchCustomers(value))), 250);
  }

  const lt = lessonTypes.find((l) => l.id === lessonTypeId);
  const duration = mode === "custom" ? custom.duration : mode === "lesson" ? lt?.durationMins ?? 60 : 60;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  function pick(c: CustomerHit) {
    setCustomer(c);
    setF((s) => ({ ...s, customerName: c.name, customerEmail: c.email, customerPhone: c.phone || s.customerPhone }));
    setHits([]);
    setQ("");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
      });
      if (res?.error) {
        setError(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">{error}</p>}

      <section className="card space-y-4">
        <h2 className="font-bold">1. Customer</h2>
        <div className="relative">
          <label className="label" htmlFor="cs">Find a registered customer (optional)</label>
          <input id="cs" className="input" value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email or phone" autoComplete="off" />
          {hits.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-white shadow-lg">
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-50" onClick={() => pick(h)}>
                    <strong>{h.name}</strong> · {h.email} {h.phone && `· ${h.phone}`} {h.credits > 0 && <span className="badge ml-1 bg-brand-100 text-brand-800">{h.credits} credits</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {customer && (
            <p className="mt-2 text-sm">
              Linked to account <strong>{customer.name}</strong>{" "}
              <button type="button" className="font-semibold text-brand-700 underline" onClick={() => { setCustomer(null); if (mode === "credit") setMode("lesson"); }}>unlink</button>
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="label" htmlFor="n">Name</label><input id="n" className="input" required value={f.customerName} onChange={set("customerName")} /></div>
          <div><label className="label" htmlFor="p">Phone</label><input id="p" type="tel" className="input" required value={f.customerPhone} onChange={set("customerPhone")} /></div>
          <div><label className="label" htmlFor="e">Email <span className="font-normal text-muted">(for confirmation)</span></label><input id="e" type="email" className="input" value={f.customerEmail} onChange={set("customerEmail")} /></div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">2. Lesson</h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Lesson type">
          {(["lesson", "custom", ...(customer && customer.credits > 0 ? ["credit"] : [])] as ("lesson" | "custom" | "credit")[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => { setMode(m); setSlot(null); }} className={`rounded-full border px-4 py-2 text-sm font-semibold ${mode === m ? "border-brand-700 bg-brand-700 text-white" : "border-line"}`}>
              {m === "lesson" ? "Standard lesson" : m === "custom" ? "Custom" : `Use package credit (${customer?.credits})`}
            </button>
          ))}
        </div>
        {mode === "lesson" && (
          <div>
            <label className="label" htmlFor="lt">Lesson type</label>
            <select id="lt" className="input" value={lessonTypeId} onChange={(e) => { setLessonTypeId(e.target.value); setSlot(null); }}>
              {lessonTypes.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.durationMins} min — {aud(l.priceCents)}</option>)}
            </select>
          </div>
        )}
        {mode === "custom" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="ct">Title</label><input id="ct" className="input" value={custom.title} onChange={(e) => setCustom((c) => ({ ...c, title: e.target.value }))} /></div>
            <div><label className="label" htmlFor="cd">Duration (minutes)</label><input id="cd" type="number" min={30} max={240} step={15} className="input" value={custom.duration} onChange={(e) => { setCustom((c) => ({ ...c, duration: Number(e.target.value) })); setSlot(null); }} /></div>
            <div><label className="label" htmlFor="cp">Price incl. GST ($)</label><input id="cp" inputMode="decimal" className="input" value={custom.price} onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))} /></div>
          </div>
        )}
        {mode !== "credit" && (
          <div className="max-w-xs"><label className="label" htmlFor="promo">Promo / voucher code</label><input id="promo" className="input uppercase" value={f.promoCode} onChange={set("promoCode")} /></div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">3. Date & time</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={timing === "slot"} onClick={() => setTiming("slot")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${timing === "slot" ? "border-brand-700 bg-brand-700 text-white" : "border-line"}`}>Available slots</button>
          <button type="button" aria-pressed={timing === "override"} onClick={() => setTiming("override")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${timing === "override" ? "border-brand-700 bg-brand-700 text-white" : "border-line"}`}>Staff override: any time</button>
        </div>
        {timing === "slot" ? (
          <DateSlotPicker durationMins={duration} value={slot} onChange={setSlot} maxAdvanceDays={maxAdvanceDays} />
        ) : (
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="od">Date</label><input id="od" type="date" className="input" value={ov.date} onChange={(e) => setOv((o) => ({ ...o, date: e.target.value }))} /></div>
            <div><label className="label" htmlFor="ot">Start time</label><input id="ot" type="time" step={300} className="input" value={ov.time} onChange={(e) => setOv((o) => ({ ...o, time: e.target.value }))} /></div>
            <p className="help sm:col-span-2">Ignores working hours, notice and travel buffer — but still refuses any overlap with another lesson or a busy Google Calendar event.</p>
          </div>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-bold">4. Pickup & notes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sub">Suburb</label>
            <input id="sub" list="admin-suburbs" className="input" required value={f.pickupSuburb} onChange={set("pickupSuburb")} />
            <datalist id="admin-suburbs">{suburbs.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          <div><label className="label" htmlFor="addr">Street address</label><input id="addr" className="input" required value={f.pickupAddress} onChange={set("pickupAddress")} /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="nt">Notes (visible to customer as their notes)</label><textarea id="nt" rows={2} className="input" value={f.customerNotes} onChange={set("customerNotes")} /></div>
        </div>
      </section>

      <div className="flex justify-end">
        <button className="btn-primary" disabled={pending || (timing === "slot" ? !slot : !ov.date || !ov.time)}>
          {pending ? "Booking…" : "Create booking"}
        </button>
      </div>
    </form>
  );
}
