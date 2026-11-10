import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { prisma, getSettings } from "@/lib/db";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Student Reviews",
  description: "Read reviews from learner drivers who took automatic driving lessons with Sagoon Driving School in Rockdale.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const [settings, reviews] = await Promise.all([
    getSettings(),
    prisma.testimonial.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const googleUrl = settings.googleReviewsUrl || `https://www.google.com/search?q=${encodeURIComponent(`${SITE.name} Rockdale reviews`)}`;
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : null;

  return (
    <div className="container-x py-12 sm:py-16">
      <div className="max-w-3xl">
        <p className="eyebrow">Reviews</p>
        <h1 className="h1 mt-2">What our students say</h1>
        <p className="mt-3 text-lg text-muted">Real feedback from learners we&apos;ve taught. Read more — or leave your own — on Google.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn-brand"><Star className="size-4" aria-hidden /> Google reviews</a>
          <Link href="/book" className="btn-outline">Book a lesson</Link>
        </div>
      </div>

      {avg != null && (
        <p className="mt-8 text-sm text-muted">
          Average rating on this page: <strong className="text-ink">{avg.toFixed(1)} / 5</strong> from {reviews.length} review{reviews.length === 1 ? "" : "s"}.
        </p>
      )}

      {reviews.length ? (
        <div className="mt-6 columns-1 gap-4 md:columns-2 lg:columns-3">
          {reviews.map((t) => (
            <figure key={t.id} className="card mb-4 break-inside-avoid">
              <div className="flex gap-0.5 text-accent-600" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" aria-hidden />)}
              </div>
              <blockquote className="mt-3">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-3 text-sm font-semibold">{t.name} <span className="font-normal text-muted">· {t.suburb}</span></figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="card mt-8 max-w-2xl">
          <p className="font-semibold">Reviews are on their way.</p>
          <p className="mt-1 text-sm text-muted">In the meantime, check our Google reviews or call us for a chat about how we teach.</p>
        </div>
      )}

      <div className="mt-12 rounded-2xl bg-brand-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold">Had a lesson with us?</h2>
        <p className="mt-1 text-muted">We&apos;d love to hear how it went. Your review helps other nervous learners find a patient instructor — thank you!</p>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-4">Leave a Google review</a>
      </div>
    </div>
  );
}
