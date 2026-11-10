"use client";
import Link from "next/link";
import { useState } from "react";

type Pkg = { slug: string; name: string; lessonCount: number; priceCents: number };
type Lesson = { slug: string; name: string; kind: string };

const Q = [
  {
    key: "exp",
    q: "How much driving have you done?",
    opts: [
      { v: "none", l: "Never driven" },
      { v: "some", l: "A little with family (under 20 hrs)" },
      { v: "lots", l: "Lots of practice (50+ hrs)" },
      { v: "overseas", l: "I have an overseas licence" },
      { v: "returning", l: "Licensed, but rusty or nervous" },
    ],
  },
  {
    key: "goal",
    q: "What's your main goal?",
    opts: [
      { v: "test", l: "Pass my P1 driving test" },
      { v: "confidence", l: "Feel confident and safe" },
      { v: "logbook", l: "Get logbook hours faster" },
    ],
  },
  {
    key: "when",
    q: "When is your test (if booked)?",
    opts: [
      { v: "soon", l: "Within 4 weeks" },
      { v: "later", l: "1–3 months away" },
      { v: "none", l: "Not booked yet" },
    ],
  },
] as const;

export function LessonEstimator({ packages, lessons }: { packages: Pkg[]; lessons: Lesson[] }) {
  const [a, setA] = useState<Record<string, string>>({});
  const done = Q.every((q) => a[q.key]);

  let range = "";
  let advice = "";
  let pkg: Pkg | undefined;
  let lesson: Lesson | undefined;
  if (done) {
    const big = [...packages].sort((x, y) => y.lessonCount - x.lessonCount)[0];
    const small = [...packages].sort((x, y) => x.lessonCount - y.lessonCount)[0];
    switch (a.exp) {
      case "none":
        range = "15–25 lessons";
        advice = "Most complete beginners need around 15–25 professional lessons alongside supervised practice with family. Start with the basics in quiet streets, then build up.";
        pkg = big;
        break;
      case "some":
        range = "10–15 lessons";
        advice = "You've got the basics — structured lessons will fix habits early and build towards test standard.";
        pkg = big;
        break;
      case "lots":
        range = "3–6 lessons";
        advice = "You're close! A few lessons focused on test routes, manoeuvres and the common test mistakes usually does it.";
        pkg = small;
        break;
      case "overseas":
        range = "1–3 lessons";
        advice = "Experienced drivers mainly need NSW rules, local habits and what testers look for.";
        pkg = packages.find((p) => p.slug.includes("overseas"));
        lesson = lessons.find((l) => l.kind === "REFRESHER");
        break;
      default:
        range = "2–5 lessons";
        advice = "Gentle refresher lessons at your pace — we'll start wherever you feel comfortable.";
        lesson = lessons.find((l) => l.kind === "CONFIDENCE");
    }
    if (a.goal === "logbook") advice += " In NSW each 1-hour professional lesson counts as 3 logbook hours, up to 10 lessons (30 hours) — a 10-pack maximises that bonus.";
    if (a.when === "soon" && a.goal === "test") advice += " With your test coming up soon, book 2 lessons a week and add our Driving Test package for the day.";
  }

  return (
    <div className="card mt-6">
      <div className="space-y-6">
        {Q.map((q) => (
          <fieldset key={q.key}>
            <legend className="font-bold">{q.q}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {q.opts.map((o) => (
                <label key={o.v} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${a[q.key] === o.v ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:border-brand-500"}`}>
                  <input type="radio" name={q.key} value={o.v} className="sr-only" checked={a[q.key] === o.v} onChange={() => setA((s) => ({ ...s, [q.key]: o.v }))} />
                  {o.l}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div aria-live="polite">
        {done && (
          <div className="mt-6 rounded-xl bg-brand-50 p-5">
            <p className="text-sm font-semibold text-brand-700">Our suggestion</p>
            <p className="text-2xl font-extrabold">{range}</p>
            <p className="mt-2 text-sm">{advice}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {pkg && <Link href={`/account/packages?buy=${pkg.slug}`} className="btn-primary btn-sm">Get the {pkg.name}</Link>}
              {lesson && <Link href={`/book?lesson=${lesson.slug}`} className="btn-primary btn-sm">Book a {lesson.name}</Link>}
              <Link href="/book" className="btn-outline btn-sm">Book a single lesson</Link>
            </div>
            <p className="mt-3 text-xs text-muted">This is a rough guide only — everyone learns at their own pace. Your instructor will give you an honest assessment after your first lesson.</p>
          </div>
        )}
      </div>
    </div>
  );
}
