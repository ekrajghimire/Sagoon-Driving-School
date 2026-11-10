import type { Metadata } from "next";
import Link from "next/link";
import { Check, Star, Car, MapPin, ShieldCheck } from "lucide-react";
import { prisma, getSettings } from "@/lib/db";
import { aud } from "@/lib/money";
import { durationLabel } from "@/lib/time";
import { LessonEstimator } from "./LessonEstimator";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Driving Lesson Prices & Packages",
  description: "Clear, GST-inclusive prices for automatic driving lessons in Rockdale: 1, 1.5 and 2-hour lessons, money-saving packages, driving test package and overseas licence refreshers.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const [lessons, packages, promos, settings] = await Promise.all([
    prisma.lessonType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.promoCode.findMany({ where: { active: true, isGiftVoucher: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
    getSettings(),
  ]);
  const singles = lessons.filter((l) => l.kind === "LESSON");
  const specials = lessons.filter((l) => l.kind !== "LESSON");
  const perHour = (cents: number, mins: number) => Math.round((cents / mins) * 60);
  const base60 = singles.find((l) => l.durationMins === 60)?.priceCents;

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-12 sm:py-16">
        <div className="container-x text-center">
          <p className="eyebrow">Pricing</p>
          <h1 className="h1 mt-2">Simple, honest prices</h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">
            Every lesson is one-on-one in our automatic dual-control car, with free pickup and drop-off around Rockdale. All prices include GST. Nothing to pay until your lesson.
          </p>
          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold">
            <li className="flex items-center gap-1.5"><Car className="size-4 text-brand-600" /> Automatic only</li>
            <li className="flex items-center gap-1.5"><MapPin className="size-4 text-brand-600" /> Free pickup & drop-off</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand-600" /> Free changes up to {settings.cancellationWindowHours}h before</li>
          </ul>
        </div>
      </section>

      {/* Single lessons */}
      <section className="container-x py-12" aria-labelledby="singles">
        <h2 id="singles" className="h2">Single lessons</h2>
        <p className="mt-1 text-muted">Pay as you go. Choose the length that suits you.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {singles.map((l) => (
            <div key={l.id} className={`card relative flex flex-col ${l.popular ? "border-2 border-brand-700" : ""}`}>
              {l.popular && <span className="badge absolute -top-3 left-5 bg-accent text-ink"><Star className="mr-1 size-3" /> Most popular</span>}
              <h3 className="text-lg font-bold">{l.name}</h3>
              <p className="mt-2 text-4xl font-extrabold">{aud(l.priceCents, { round: true })}</p>
              <p className="text-sm text-muted">{durationLabel(l.durationMins)} · {aud(perHour(l.priceCents, l.durationMins), { round: true })}/hr incl. GST</p>
              <p className="mt-3 flex-1 text-sm">{l.description}</p>
              <Link href={`/book?lesson=${l.slug}`} className={`${l.popular ? "btn-primary" : "btn-outline"} mt-5`}>Book {durationLabel(l.durationMins)}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="bg-surface py-12" aria-labelledby="pk">
        <div className="container-x">
          <h2 id="pk" className="h2">Lesson packages — save more</h2>
          <p className="mt-1 text-muted">Buy a package and book each lesson online with your credits. Credits don&apos;t expire.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {packages.map((p) => {
              const single = singles.find((l) => l.durationMins === p.lessonDurationMins)?.priceCents ?? base60 ?? 0;
              const saving = single * p.lessonCount - p.priceCents;
              return (
                <div key={p.id} className={`card relative flex flex-col ${p.popular ? "border-2 border-brand-700 shadow-lg" : ""}`}>
                  {p.popular && <span className="badge absolute -top-3 left-5 bg-accent text-ink"><Star className="mr-1 size-3" /> Most popular</span>}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="mt-2 text-4xl font-extrabold">{aud(p.priceCents, { round: true })}</p>
                  <p className="text-sm text-muted">
                    {p.lessonCount} × {durationLabel(p.lessonDurationMins)} · {aud(Math.round(p.priceCents / p.lessonCount), { round: true })} per lesson
                    {saving > 0 && <span className="ml-1 font-semibold text-ok">· save {aud(saving, { round: true })}</span>}
                  </p>
                  <p className="mt-3 text-sm">{p.description}</p>
                  <ul className="mt-3 flex-1 space-y-1.5 text-sm">
                    {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" /> {f}</li>)}
                  </ul>
                  <Link href={`/account/packages?buy=${p.slug}`} className={`${p.popular ? "btn-primary" : "btn-outline"} mt-5`}>Get this package</Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Special lessons */}
      <section className="container-x py-12" aria-labelledby="sp">
        <h2 id="sp" className="h2">Test day & specialist lessons</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {specials.map((l) => (
            <div key={l.id} className="card flex flex-col">
              <h3 className="text-lg font-bold">{l.name}</h3>
              <p className="mt-2 text-3xl font-extrabold">{aud(l.priceCents, { round: true })}</p>
              <p className="text-sm text-muted">{durationLabel(l.durationMins)} total</p>
              <p className="mt-3 flex-1 text-sm">{l.description}</p>
              <Link href={`/book?lesson=${l.slug}`} className="btn-outline mt-5">Book now</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="container-x pb-12" aria-labelledby="cmp">
        <h2 id="cmp" className="h2">Compare options</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="table-x min-w-[640px]">
            <caption className="sr-only">Price comparison of lessons and packages</caption>
            <thead className="bg-surface">
              <tr><th scope="col">Option</th><th scope="col">Lessons</th><th scope="col">Total time</th><th scope="col">Price (incl. GST)</th><th scope="col">Effective hourly rate</th></tr>
            </thead>
            <tbody>
              {singles.map((l) => (
                <tr key={l.id}><th scope="row" className="px-3 py-2 font-semibold">{l.name}</th><td>1</td><td>{durationLabel(l.durationMins)}</td><td>{aud(l.priceCents)}</td><td>{aud(perHour(l.priceCents, l.durationMins))}</td></tr>
              ))}
              {packages.map((p) => (
                <tr key={p.id} className={p.popular ? "bg-brand-50" : ""}>
                  <th scope="row" className="px-3 py-2 font-semibold">{p.name} {p.popular && <span className="badge ml-1 bg-accent text-ink">Most popular</span>}</th>
                  <td>{p.lessonCount}</td><td>{durationLabel(p.lessonCount * p.lessonDurationMins)}</td><td>{aud(p.priceCents)}</td><td className="font-semibold text-ok">{aud(perHour(p.priceCents, p.lessonCount * p.lessonDurationMins))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted">All prices in Australian dollars and include 10% GST. Pickup within our service area is free.</p>
      </section>

      {/* Discounts */}
      {promos.length > 0 && (
        <section className="container-x pb-12" aria-labelledby="disc">
          <div className="rounded-2xl bg-brand-700 p-6 text-white sm:p-8">
            <h2 id="disc" className="text-2xl font-extrabold">Discounts</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {promos.map((p) => (
                <li key={p.id} className="rounded-xl bg-white/10 p-4">
                  <p className="text-2xl font-extrabold text-accent">{p.kind === "PERCENT" ? `${p.value}% off` : `${aud(p.value, { round: true })} off`}</p>
                  <p className="mt-1 text-sm">{p.description}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-brand-100">Ask us for your code and enter it when booking. One discount per lesson. Gift vouchers available — <Link href="/contact" className="underline">contact us</Link>.</p>
          </div>
        </section>
      )}

      {/* Estimator */}
      <section id="estimator" className="bg-surface py-12" aria-labelledby="est">
        <div className="container-x max-w-3xl">
          <h2 id="est" className="h2">How many lessons do I need?</h2>
          <p className="mt-1 text-muted">Answer three quick questions for a personalised suggestion.</p>
          <LessonEstimator
            packages={packages.map((p) => ({ slug: p.slug, name: p.name, lessonCount: p.lessonCount, priceCents: p.priceCents }))}
            lessons={lessons.map((l) => ({ slug: l.slug, name: l.name, kind: l.kind }))}
          />
        </div>
      </section>
    </>
  );
}
