import Link from "next/link";
import { Car, HeartHandshake, MapPin, CalendarCheck, BookOpenCheck, Phone, Star, Check, ShieldCheck, User, ArrowRight } from "lucide-react";
import { prisma, getSettings } from "@/lib/db";
import { aud } from "@/lib/money";
import { durationLabel } from "@/lib/time";
import { SITE } from "@/lib/site";
import { FaqItem } from "@/components/content/FaqItem";

export const dynamic = "force-dynamic";

const BENEFITS = [
  { icon: Car, title: "Automatic dual-control car", text: "Learn in a modern automatic with an instructor brake, so you're always safe." },
  { icon: HeartHandshake, title: "Patient with nervous learners", text: "Calm, judgement-free lessons at your pace. We never shout — promise." },
  { icon: MapPin, title: "Free pickup & drop-off", text: "From home, school, work or the station across Rockdale and nearby suburbs." },
  { icon: CalendarCheck, title: "Book online 24/7", text: "See live availability, book in two minutes and reschedule online." },
  { icon: BookOpenCheck, title: "3-for-1 logbook hours", text: "In NSW, each 1-hour professional lesson counts as 3 logbook hours (up to 10 lessons)." },
];

export default async function HomePage() {
  const [settings, lessons, packages, testimonials, faqs] = await Promise.all([
    getSettings(),
    prisma.lessonType.findMany({ where: { active: true, kind: "LESSON" }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
  ]);
  const fromPrice = lessons.length ? Math.min(...lessons.map((l) => l.priceCents)) : null;
  const popularPkg = packages.find((p) => p.popular) ?? packages[0];
  const reviewsUrl = settings.googleReviewsUrl || "/reviews";

  const stats = [
    settings.statPassRate && { value: settings.statPassRate, label: "first-time pass rate" },
    settings.statStudents && { value: settings.statStudents, label: "students taught" },
    { value: "1-on-1", label: "every lesson, private" },
    { value: "Mon–Sat", label: "early & evening lessons" },
    { value: `${settings.cancellationWindowHours}h`, label: "free reschedule window" },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 text-white">
        <div className="container-x grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
              <span className="grid size-5 place-items-center rounded bg-accent text-xs font-black text-ink">L</span> Rockdale & St George, Sydney
            </p>
            <h1 className="mt-4 text-[2.25rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Calm, patient driving lessons that build <span className="text-accent">real confidence</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-brand-100">
              Automatic lessons with free pickup, an instructor who genuinely enjoys teaching nervous learners, and online booking that takes two minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 min-[400px]:flex-row min-[400px]:flex-wrap">
              <Link href="/book" className="btn-primary px-7 text-lg">
                Book a lesson <ArrowRight className="size-5" aria-hidden />
              </Link>
              <a href={`tel:${SITE.phoneTel}`} className="btn-inverse">
                <Phone className="size-5" aria-hidden /> {SITE.phoneDisplay}
              </a>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-brand-100">
              {fromPrice != null && <li className="flex items-center gap-1.5"><Check className="size-4 shrink-0 text-accent" aria-hidden /> From {aud(fromPrice, { round: true })} incl. GST</li>}
              <li className="flex items-center gap-1.5"><Check className="size-4 shrink-0 text-accent" aria-hidden /> Pay at your lesson</li>
              <li className="flex items-center gap-1.5"><Check className="size-4 shrink-0 text-accent" aria-hidden /> Free changes up to {settings.cancellationWindowHours}h before</li>
            </ul>
          </div>
          {/* Replace this illustration with a real photo: public/images/hero-car.jpg (instructor + car, landscape, ~1600px wide) via next/image */}
          <div className="relative mx-auto w-full max-w-sm sm:max-w-md" aria-hidden>
            <div className="absolute -inset-6 rounded-[2.5rem] bg-accent/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/20 bg-white/10 p-6 backdrop-blur">
              <svg viewBox="0 0 400 220" className="w-full">
                <rect x="0" y="170" width="400" height="50" rx="10" fill="#082f4a" />
                <rect x="20" y="192" width="50" height="6" rx="3" fill="#facc15" />
                <rect x="110" y="192" width="50" height="6" rx="3" fill="#facc15" />
                <rect x="200" y="192" width="50" height="6" rx="3" fill="#facc15" />
                <rect x="290" y="192" width="50" height="6" rx="3" fill="#facc15" />
                <path d="M70 150 Q80 95 140 90 L250 88 Q300 90 330 130 L350 150 Q355 168 340 170 L80 170 Q62 168 70 150Z" fill="#fff" />
                <path d="M150 98 L245 96 Q280 98 300 128 L140 130 Z" fill="#a9d2f0" />
                <circle cx="125" cy="170" r="22" fill="#0f2a43" /><circle cx="125" cy="170" r="9" fill="#dbe4ee" />
                <circle cx="295" cy="170" r="22" fill="#0f2a43" /><circle cx="295" cy="170" r="9" fill="#dbe4ee" />
                <rect x="180" y="58" width="44" height="34" rx="4" fill="#facc15" stroke="#0f2a43" strokeWidth="3" />
                <text x="202" y="84" textAnchor="middle" fontSize="26" fontWeight="900" fill="#0f2a43">L</text>
              </svg>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/10 p-3"><p className="font-bold">Automatic</p><p className="text-brand-100">Dual controls</p></div>
                <div className="rounded-xl bg-white/10 p-3"><p className="font-bold">Free pickup</p><p className="text-brand-100">Rockdale area</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="At a glance" className="border-b border-line bg-white">
        <dl className="container-x flex flex-wrap justify-center gap-y-6 py-8 text-center">
          {stats.slice(0, 5).map((s) => (
            <div key={s.label} className="flex basis-1/2 flex-col-reverse px-2 sm:basis-1/3 lg:flex-1">
              <dt className="text-sm text-muted">{s.label}</dt>
              <dd className="text-2xl font-extrabold text-brand-700 tabular-nums sm:text-3xl">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Benefits */}
      <section className="container-x py-16" aria-labelledby="why">
        <p className="eyebrow">Why learners choose us</p>
        <h2 id="why" className="h2 mt-1">Learning to drive shouldn&apos;t be stressful</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card">
              <span className="icon-tile"><b.icon className="size-6" aria-hidden /></span>
              <h3 className="mt-4 text-lg font-bold">{b.title}</h3>
              <p className="mt-1 text-sm text-muted">{b.text}</p>
            </div>
          ))}
          <div className="card card-hover relative flex flex-col justify-center border-brand-100 bg-brand-50">
            <h3 className="text-lg font-bold">Nervous about your first lesson?</h3>
            <p className="mt-1 text-sm text-muted">Read our guide to calm, confident first drives.</p>
            <Link href="/resources" className="link-underline mt-3 w-fit after:absolute after:inset-0 after:rounded-2xl">Learner tips →</Link>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-surface py-16" aria-labelledby="prices">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Pricing</p>
              <h2 id="prices" className="h2 mt-1">Clear prices, GST included</h2>
            </div>
            <Link href="/pricing" className="btn-outline">See all prices & packages</Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lessons.map((l) => (
              <div key={l.id} className={`card card-hover relative flex flex-col ${l.popular ? "card-featured" : ""}`}>
                {l.popular && <span className="badge mb-2 w-fit bg-accent text-ink">Most popular</span>}
                <h3 className="font-bold">{l.name}</h3>
                <p className="mt-1 text-3xl font-extrabold tabular-nums">{aud(l.priceCents, { round: true })}</p>
                <p className="text-sm text-muted">{durationLabel(l.durationMins)}</p>
                <Link href={`/book?lesson=${l.slug}`} className="link-underline mt-auto w-fit pt-4 text-sm after:absolute after:inset-0 after:rounded-2xl">
                  Book this<span className="sr-only">: {l.name}</span> →
                </Link>
              </div>
            ))}
            {popularPkg && (
              <div className="card card-hover relative flex flex-col border-brand-700 bg-brand-700 text-white hover:border-brand-800">
                <span className="badge mb-2 w-fit bg-accent text-ink">Best value</span>
                <h3 className="font-bold">{popularPkg.name}</h3>
                <p className="mt-1 text-3xl font-extrabold tabular-nums">{aud(popularPkg.priceCents, { round: true })}</p>
                <p className="text-sm text-brand-100">{popularPkg.lessonCount} × {durationLabel(popularPkg.lessonDurationMins)}</p>
                <Link href="/pricing#packages" className="link-inverse mt-auto w-fit pt-4 text-sm after:absolute after:inset-0 after:rounded-2xl">View packages →</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container-x py-16" aria-labelledby="reviews">
        <p className="eyebrow">Reviews</p>
        <h2 id="reviews" className="h2 mt-1">What our students say</h2>
        {testimonials.length ? (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="card flex flex-col">
                  <div className="flex gap-0.5 text-accent-600" role="img" aria-label={`${t.rating} out of 5 stars`}>
                    {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" aria-hidden />)}
                  </div>
                  <blockquote className="mt-3 flex-1 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4 border-t border-line pt-3 text-sm font-semibold">{t.name} <span className="font-normal text-muted">· {t.suburb}</span></figcaption>
                </figure>
              ))}
            </div>
            <Link href="/reviews" className="link-underline mt-6 inline-block">Read more reviews →</Link>
          </>
        ) : (
          <div className="card mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">See what learners say on Google</h3>
              <p className="text-sm text-muted">Had a lesson with us? A quick review helps other nervous learners find a patient instructor.</p>
            </div>
            <a href={reviewsUrl} className="btn-brand shrink-0" {...(reviewsUrl.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              <Star className="size-4" aria-hidden /> Read or leave a review
            </a>
          </div>
        )}
      </section>

      {/* Suburbs */}
      <section className="bg-surface py-16" aria-labelledby="areas">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Service area</p>
            <h2 id="areas" className="h2 mt-1">Free pickup across Rockdale & nearby</h2>
            <p className="mt-3 text-muted">We&apos;ll meet you at home, school, work or the train station. Not sure if we cover your area? Just ask.</p>
            <Link href="/contact" className="btn-outline mt-5">Ask about your suburb</Link>
          </div>
          <ul className="flex flex-wrap content-start gap-2">
            {settings.suburbs.map((s) => (
              <li key={s} className="badge border border-line bg-white px-3 py-1.5 text-sm text-ink"><MapPin className="size-3.5 text-brand-600" aria-hidden /> {s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* About teaser */}
      <section className="container-x grid items-center gap-8 py-16 lg:grid-cols-2">
        {/* Replace with a real instructor photo: public/images/instructor.jpg (portrait, friendly, in front of the car) */}
        <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-gradient-to-br from-brand-100 to-brand-50" aria-hidden>
          <User className="size-24 text-brand-200" />
        </div>
        <div>
          <p className="eyebrow">Your instructor</p>
          <h2 className="h2 mt-1">Accredited, patient and local</h2>
          <p className="mt-3 text-muted">Every lesson is with the same NSW-licensed instructor, so you never have to start over with someone new. We explain clearly, plan each lesson around your goals and track your skills so you can see your progress.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-ok" aria-hidden /> Licensed NSW driving instructor</li>
            <li className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-ok" aria-hidden /> Fully insured dual-control automatic</li>
            <li className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-ok" aria-hidden /> Skills progress tracker in your account</li>
          </ul>
          <Link href="/about" className="btn-outline mt-5">Meet your instructor</Link>
        </div>
      </section>

      {/* FAQ preview */}
      {faqs.length > 0 && (
        <section className="bg-surface py-16" aria-labelledby="faqh">
          <div className="container-x max-w-3xl">
            <p className="eyebrow">FAQ</p>
            <h2 id="faqh" className="h2 mt-1">Common questions</h2>
            <div className="mt-6 space-y-3">
              {faqs.map((f) => (
                <FaqItem key={f.id} question={f.question} answer={f.answer} compact />
              ))}
            </div>
            <Link href="/faq" className="link-underline mt-6 inline-block">All FAQs →</Link>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="container-x py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-600 px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Ready when you are</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">Pick a time that suits you — early mornings, after school and evenings available. Nothing to pay until your lesson.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/book" className="btn-primary px-7 text-lg">Book a lesson</Link>
            <a href={`https://wa.me/${SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" className="btn-inverse">Message on WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  );
}
