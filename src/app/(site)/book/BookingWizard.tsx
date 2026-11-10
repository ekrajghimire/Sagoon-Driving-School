"use client";
import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Car, Clock, MapPin, Ticket, Loader2 } from "lucide-react";
import { DateSlotPicker, type SlotChoice } from "@/components/DateSlotPicker";
import { createBookingAction, checkPromo } from "./actions";
import { joinWaitlist, type FormState } from "@/app/actions/public";

type LessonOpt = { id: string; slug: string; name: string; description: string; durationMins: number; priceCents: number; popular: boolean };

const aud = (c: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(c / 100);
const dur = (m: number) => (m % 60 === 0 ? `${m / 60} hr${m > 60 ? "s" : ""}` : `${(m / 60).toFixed(1)} hrs`);
const STEPS = ["Lesson", "Date & time", "Your details", "Confirm"];

export function BookingWizard(props: {
  lessonTypes: LessonOpt[];
  credit: { remaining: number; durationMins: number; name: string } | null;
  user: { name: string; email: string; phone: string } | null;
  suburbs: string[];
  addresses: { id: string; address: string; suburb: string }[];
  maxAdvanceDays: number;
  initialLessonSlug?: string;
  initialDate?: string;
  cancellationHours: number;
}) {
  const initialLesson = props.lessonTypes.find((l) => l.slug === props.initialLessonSlug);
  const [step, setStep] = useState(initialLesson ? 1 : 0);
  const [lessonId, setLessonId] = useState<string | "credit" | null>(initialLesson?.id ?? null);
  const [slot, setSlot] = useState<SlotChoice>(null);
  const [noSlotsDate, setNoSlotsDate] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerName: props.user?.name ?? "",
    customerEmail: props.user?.email ?? "",
    customerPhone: props.user?.phone ?? "",
    pickupSuburb: props.addresses[0]?.suburb ?? "",
    pickupAddress: props.addresses[0]?.address ?? "",
    customerNotes: "",
    promoCode: "",
    consent: false,
    saveAddress: true,
  });
  const [promo, setPromo] = useState<{ ok: boolean; message: string; kind?: "PERCENT" | "FIXED"; value?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [checkingPromo, startPromo] = useTransition();

  const lesson = props.lessonTypes.find((l) => l.id === lessonId);
  const durationMins = lessonId === "credit" ? props.credit?.durationMins ?? 60 : lesson?.durationMins ?? 60;
  const price = lessonId === "credit" ? 0 : lesson?.priceCents ?? 0;
  const discount = useMemo(() => {
    if (!promo?.ok || !price) return 0;
    const d = promo.kind === "PERCENT" ? Math.round((price * (promo.value ?? 0)) / 100) : promo.value ?? 0;
    return Math.min(price, d);
  }, [promo, price]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const detailsValid =
    form.customerName.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(form.customerEmail) &&
    /^[0-9 +()-]{8,20}$/.test(form.customerPhone.trim()) &&
    form.pickupSuburb.trim().length >= 2 &&
    form.pickupAddress.trim().length >= 4;

  function submit() {
    setError(null);
    startSubmit(async () => {
      const res = await createBookingAction({
        ...form,
        promoCode: promo?.ok ? form.promoCode : null,
        date: slot!.date,
        startMin: slot!.startMin,
        lessonTypeId: lessonId === "credit" ? null : lessonId,
        usePackageCredit: lessonId === "credit",
      });
      // On success the action redirects; we only get here on error.
      if (res?.error) {
        setError(res.error);
        if (res.code === "SLOT_TAKEN") {
          setSlot(null);
          setStep(1);
        }
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card">
        {/* Progress */}
        <ol className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Booking progress">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined} className={`flex items-center gap-2 rounded-full px-3 py-1 font-semibold ${i === step ? "bg-brand-700 text-white" : i < step ? "bg-brand-50 text-brand-800" : "bg-surface text-muted"}`}>
              <span className="grid size-5 place-items-center rounded-full bg-white/20 text-xs">{i < step ? <Check className="size-3.5" /> : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        {step === 0 && (
          <section aria-labelledby="s0">
            <h2 id="s0" className="text-xl font-bold">What would you like to book?</h2>
            <p className="mt-1 text-sm text-muted">All lessons are in our automatic, dual-control car with free pickup and drop-off.</p>
            <div className="mt-4 grid gap-3" role="radiogroup">
              {props.credit && props.credit.remaining > 0 && (
                <LessonCard
                  checked={lessonId === "credit"}
                  onSelect={() => setLessonId("credit")}
                  title={`Use a package lesson (${props.credit.remaining} left)`}
                  desc={`${props.credit.name} · ${dur(props.credit.durationMins)}`}
                  price="Prepaid"
                  badge="Your credit"
                />
              )}
              {props.lessonTypes.map((l) => (
                <LessonCard key={l.id} checked={lessonId === l.id} onSelect={() => setLessonId(l.id)} title={l.name} desc={`${dur(l.durationMins)} · ${l.description}`} price={aud(l.priceCents)} badge={l.popular ? "Most popular" : undefined} />
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              Want to save? <Link href="/pricing#packages" className="font-semibold text-brand-700 underline">Get a lesson package</Link> and book each lesson with your credits.
            </p>
            <div className="mt-6 flex justify-end">
              <button className="btn-primary" disabled={!lessonId} onClick={() => setStep(1)}>Continue</button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="s1">
            <h2 id="s1" className="mb-4 text-xl font-bold">Choose a date and start time</h2>
            <DateSlotPicker durationMins={durationMins} value={slot} onChange={setSlot} maxAdvanceDays={props.maxAdvanceDays} initialDate={props.initialDate} onNoSlots={setNoSlotsDate} />
            {noSlotsDate && !slot && <Waitlist date={noSlotsDate} user={props.user} />}
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(0)}>Back</button>
              <button className="btn-primary" disabled={!slot} onClick={() => setStep(2)}>Continue</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="s2">
            <h2 id="s2" className="text-xl font-bold">Your details</h2>
            {!props.user && (
              <p className="mt-1 text-sm text-muted">
                Booking as a guest is fine. <Link href="/login?next=/book" className="font-semibold text-brand-700 underline">Log in</Link> to track progress and use package credits.
              </p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field id="name" label="Full name" value={form.customerName} onChange={set("customerName")} autoComplete="name" />
              <Field id="phone" label="Mobile number" type="tel" value={form.customerPhone} onChange={set("customerPhone")} autoComplete="tel" hint="For lesson-day contact only" />
              <div className="sm:col-span-2">
                <Field id="email" label="Email" type="email" value={form.customerEmail} onChange={set("customerEmail")} autoComplete="email" hint="We'll send your confirmation and reminders here" />
              </div>
              {props.addresses.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="saved">Saved pickup addresses</label>
                  <select id="saved" className="input" onChange={(e) => { const a = props.addresses.find((x) => x.id === e.target.value); if (a) setForm((f) => ({ ...f, pickupAddress: a.address, pickupSuburb: a.suburb })); }}>
                    <option value="">Choose…</option>
                    {props.addresses.map((a) => <option key={a.id} value={a.id}>{a.address}, {a.suburb}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label" htmlFor="suburb">Pickup suburb</label>
                <input id="suburb" list="suburbs" className="input" value={form.pickupSuburb} onChange={set("pickupSuburb")} autoComplete="address-level2" required />
                <datalist id="suburbs">{props.suburbs.map((s) => <option key={s} value={s} />)}</datalist>
                <p className="help">We cover Rockdale & nearby suburbs</p>
              </div>
              <Field id="address" label="Pickup street address" value={form.pickupAddress} onChange={set("pickupAddress")} autoComplete="street-address" hint="Home, school, work or station" />
              <div className="sm:col-span-2">
                <label className="label" htmlFor="notes">Anything we should know? <span className="font-normal text-muted">(optional)</span></label>
                <textarea id="notes" rows={3} className="input" value={form.customerNotes} onChange={set("customerNotes")} placeholder="e.g. first ever lesson, feeling nervous, test date booked for…" />
              </div>
              {lessonId !== "credit" && (
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="promo">Promo, referral or gift voucher code <span className="font-normal text-muted">(optional)</span></label>
                  <div className="flex gap-2">
                    <input id="promo" className="input uppercase" value={form.promoCode} onChange={(e) => { setPromo(null); set("promoCode")(e); }} />
                    <button type="button" className="btn-outline" disabled={!form.promoCode.trim() || checkingPromo} onClick={() => startPromo(async () => setPromo(await checkPromo(form.promoCode)))}>
                      {checkingPromo ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                    </button>
                  </div>
                  {promo && <p className={`mt-1 text-sm ${promo.ok ? "text-ok" : "text-danger"}`} role="status">{promo.ok ? `✓ ${promo.message}` : promo.message}</p>}
                </div>
              )}
              {props.user && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={form.saveAddress} onChange={set("saveAddress")} /> Save this pickup address to my account
                </label>
              )}
            </div>
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" disabled={!detailsValid} onClick={() => setStep(3)}>Review booking</button>
            </div>
          </section>
        )}

        {step === 3 && slot && (
          <section aria-labelledby="s3">
            <h2 id="s3" className="text-xl font-bold">Check and confirm</h2>
            <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
              <Row k="Lesson" v={`${lessonId === "credit" ? `${props.credit?.name} lesson` : lesson?.name} (${dur(durationMins)}, automatic)`} />
              <Row k="When" v={`${new Date(`${slot.date}T12:00:00Z`).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })} at ${slot.label}`} />
              <Row k="Pickup" v={`${form.pickupAddress}, ${form.pickupSuburb}`} />
              <Row k="Name" v={form.customerName} />
              <Row k="Contact" v={`${form.customerPhone} · ${form.customerEmail}`} />
              <Row k="Price" v={lessonId === "credit" ? "1 package credit" : discount ? `${aud(price - discount)} (was ${aud(price)}) incl. GST` : `${aud(price)} incl. GST`} />
              <Row k="Payment" v={lessonId === "credit" ? "Prepaid with your package" : "Pay at your lesson — card, cash or PayID"} />
            </dl>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 size-4" checked={form.consent} onChange={set("consent")} />
              <span>
                I agree to the <Link href="/terms" target="_blank" className="font-semibold underline">terms</Link>, the{" "}
                <Link href="/cancellation-policy" target="_blank" className="font-semibold underline">{props.cancellationHours}-hour cancellation policy</Link>, and the{" "}
                <Link href="/privacy" target="_blank" className="font-semibold underline">privacy policy</Link>, and I consent to being contacted about this booking.
              </span>
            </label>
            <div className="mt-6 flex justify-between">
              <button className="btn-outline" onClick={() => setStep(2)} disabled={submitting}>Back</button>
              <button className="btn-primary" disabled={!form.consent || submitting} onClick={submit}>
                {submitting ? <><Loader2 className="size-4 animate-spin" /> Booking…</> : "Confirm booking"}
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Summary */}
      <aside className="card h-fit space-y-3 lg:sticky lg:top-24" aria-label="Booking summary">
        <h2 className="font-bold">Summary</h2>
        <p className="flex items-start gap-2 text-sm"><Car className="mt-0.5 size-4 text-brand-600" /> {lessonId === "credit" ? `${props.credit?.name} lesson` : lesson?.name ?? "Choose a lesson"} · Automatic</p>
        <p className="flex items-start gap-2 text-sm"><Clock className="mt-0.5 size-4 text-brand-600" /> {slot ? `${slot.date.split("-").reverse().join("/")} at ${slot.label} · ${dur(durationMins)}` : "Choose a time"}</p>
        <p className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 size-4 text-brand-600" /> {form.pickupSuburb || "Free pickup & drop-off"}</p>
        {discount > 0 && <p className="flex items-start gap-2 text-sm text-ok"><Ticket className="mt-0.5 size-4" /> −{aud(discount)}</p>}
        <div className="border-t border-line pt-3">
          <p className="flex justify-between text-lg font-extrabold"><span>Total</span><span>{lessonId === "credit" ? "Prepaid" : aud(price - discount)}</span></p>
          <p className="text-xs text-muted">Incl. GST. Nothing to pay now.</p>
        </div>
      </aside>
    </div>
  );
}

function LessonCard({ checked, onSelect, title, desc, price, badge }: { checked: boolean; onSelect: () => void; title: string; desc: string; price: string; badge?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect} className={`flex w-full items-start justify-between gap-4 rounded-xl border p-4 text-left transition ${checked ? "border-brand-700 bg-brand-50 ring-2 ring-brand-200" : "border-line hover:border-brand-500"}`}>
      <span>
        <span className="flex flex-wrap items-center gap-2 font-bold">
          {title}
          {badge && <span className="badge bg-accent text-ink">{badge}</span>}
        </span>
        <span className="mt-1 block text-sm text-muted">{desc}</span>
      </span>
      <span className="shrink-0 text-lg font-extrabold">{price}</span>
    </button>
  );
}

function Field({ id, label, hint, ...rest }: { id: string; label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="input" required aria-describedby={hint ? `${id}-hint` : undefined} {...rest} />
      {hint && <p id={`${id}-hint`} className="help">{hint}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-3">
      <dt className="text-muted">{k}</dt>
      <dd className="col-span-2 font-semibold">{v}</dd>
    </div>
  );
}

function Waitlist({ date, user }: { date: string; user: { name: string; email: string; phone: string } | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(joinWaitlist, {});
  if (state.ok) return <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-semibold text-ok" role="status">{state.message}</p>;
  return (
    <form action={action} className="mt-4 rounded-xl border border-dashed border-brand-200 bg-brand-50/50 p-4">
      <p className="font-semibold">Fully booked? Join the waitlist for this day</p>
      <p className="text-sm text-muted">If someone cancels, we&apos;ll email you straight away.</p>
      <input type="hidden" name="date" value={date} />
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input name="name" aria-label="Name" placeholder="Name" defaultValue={user?.name} className="input" required />
        <input name="email" aria-label="Email" type="email" placeholder="Email" defaultValue={user?.email} className="input" required />
        <input name="phone" aria-label="Phone" type="tel" placeholder="Mobile" defaultValue={user?.phone} className="input" required />
      </div>
      {state.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      <button className="btn-brand btn-sm mt-3" disabled={pending}>Join waitlist</button>
    </form>
  );
}
