import type { Metadata } from "next";
import Link from "next/link";
import { Check, User, Car, Languages, Award, HeartHandshake, Target, Smile } from "lucide-react";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "About Us & Your Instructor",
  description: "Meet the patient, accredited driving instructor behind Sagoon Driving School in Rockdale, and the automatic dual-control car you'll learn in.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { icon: HeartHandshake, title: "Patience first", text: "Everyone learns differently. We go at your pace and never rush or raise our voice." },
  { icon: Target, title: "Lessons with a plan", text: "Each lesson has a clear goal, and your skills are tracked so you can see progress." },
  { icon: Smile, title: "Honest feedback", text: "We'll tell you kindly and clearly what's going well and what to practise next." },
];

export default async function AboutPage() {
  const [instructors, vehicles] = await Promise.all([
    prisma.instructor.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } }),
    prisma.vehicle.findMany({ where: { active: true } }),
  ]);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white py-12 sm:py-16">
        <div className="container-x max-w-3xl text-center">
          <p className="eyebrow">About us</p>
          <h1 className="h1 mt-2">A small, local driving school that cares</h1>
          <p className="mt-4 text-lg text-muted">
            Sagoon Driving School helps learners across Rockdale and the St George area become safe, confident drivers — especially people who feel nervous behind the wheel. One instructor, one car, and lessons built around you.
          </p>
        </div>
      </section>

      {instructors.map((ins) => (
        <section key={ins.id} className="container-x grid items-start gap-10 py-12 lg:grid-cols-[2fr_3fr]" aria-labelledby={`ins-${ins.id}`}>
          {/* Replace with a real photo: public/images/instructor.jpg (or set photoUrl in the database) */}
          {ins.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ins.photoUrl} alt={`${ins.name}, driving instructor`} className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl object-cover shadow-md lg:max-w-none" />
          ) : (
            <div className="mx-auto grid aspect-[4/5] w-full max-w-sm place-items-center rounded-3xl bg-gradient-to-br from-brand-100 to-brand-50 lg:max-w-none" aria-hidden>
              <User className="size-28 text-brand-200" />
            </div>
          )}
          <div>
            <p className="eyebrow">Your instructor</p>
            <h2 id={`ins-${ins.id}`} className="h2 mt-1">{ins.name}</h2>
            <p className="mt-4 whitespace-pre-line text-muted">{ins.bio}</p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-3"><Award className="size-5 shrink-0 text-brand-600" aria-hidden /> <span><strong>Accreditation:</strong> {ins.accreditation}</span></li>
              {ins.languages.length > 0 && (
                <li className="flex gap-3"><Languages className="size-5 shrink-0 text-brand-600" aria-hidden /> <span><strong>Lessons in:</strong> {ins.languages.join(", ")}</span></li>
              )}
            </ul>
          </div>
        </section>
      ))}

      <section className="bg-surface py-12" aria-labelledby="car">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The car</p>
            <h2 id="car" className="h2 mt-1">Learn in a modern automatic</h2>
            {vehicles.map((v) => (
              <div key={v.id} className="mt-4">
                <p className="text-lg font-bold">{v.name}</p>
                <p className="text-sm text-muted">{v.transmission} transmission</p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {v.features.map((f) => <li key={f} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden /> {f}</li>)}
                </ul>
              </div>
            ))}
            <p className="mt-4 text-sm text-muted">The dual controls mean your instructor has their own brake — so you can focus on learning, knowing help is always there.</p>
          </div>
          {/* Replace with a real car photo: public/images/car.jpg */}
          {vehicles[0]?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vehicles[0].photoUrl} alt={vehicles[0].name} className="aspect-video w-full rounded-3xl object-cover shadow-md" />
          ) : (
            <div className="grid aspect-video w-full place-items-center rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500" aria-hidden>
              <Car className="size-24 text-white/60" />
            </div>
          )}
        </div>
      </section>

      <section className="container-x py-12" aria-labelledby="values">
        <h2 id="values" className="h2">How we teach</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {VALUES.map((v) => (
            <div key={v.title} className="card">
              <span className="icon-tile"><v.icon className="size-6" aria-hidden /></span>
              <h3 className="mt-4 text-lg font-bold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted">{v.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap">
          <Link href="/book" className="btn-primary">Book a lesson</Link>
          <Link href="/reviews" className="btn-outline">Read reviews</Link>
        </div>
      </section>
    </>
  );
}
