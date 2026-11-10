import type { Metadata } from "next";
import { prisma, getSettings } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { creditBalance } from "@/lib/booking-service";
import { BookingWizard } from "./BookingWizard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Book a Driving Lesson Online",
  description: "See live availability and book an automatic driving lesson in Rockdale in under 2 minutes. Free pickup, pay on the day.",
  alternates: { canonical: "/book" },
};

export default async function BookPage({ searchParams }: { searchParams: Promise<{ lesson?: string; date?: string }> }) {
  const sp = await searchParams;
  const [lessonTypes, settings, user] = await Promise.all([
    prisma.lessonType.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    getSettings(),
    getCurrentUser(),
  ]);
  const credits = user ? await creditBalance(user.id) : null;
  const creditPurchase = credits?.purchases.find((p) => p.creditsUsed < p.creditsTotal);
  const addresses = user ? await prisma.savedAddress.findMany({ where: { userId: user.id } }) : [];

  return (
    <div className="bg-surface py-8 sm:py-12">
      <div className="container-x">
        <p className="eyebrow">Book online</p>
        <h1 className="h1 mt-1">Book your lesson</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Live availability for our automatic dual-control car. No payment needed now — pay at your lesson. Free changes up to {settings.cancellationWindowHours} hours before.
        </p>
        <div className="mt-8">
          <BookingWizard
            lessonTypes={lessonTypes.map((l) => ({ id: l.id, slug: l.slug, name: l.name, description: l.description, durationMins: l.durationMins, priceCents: l.priceCents, popular: l.popular, kind: l.kind }))}
            credit={creditPurchase ? { remaining: credits!.remaining, durationMins: creditPurchase.package.lessonDurationMins, name: creditPurchase.package.name } : null}
            user={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : null}
            suburbs={settings.suburbs}
            addresses={addresses.map((a) => ({ id: a.id, address: a.address, suburb: a.suburb }))}
            maxAdvanceDays={settings.maxAdvanceDays}
            bufferMins={settings.travelBufferMins}
            initialLessonSlug={sp.lesson}
            initialDate={sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined}
            cancellationHours={settings.cancellationWindowHours}
          />
        </div>
      </div>
    </div>
  );
}
