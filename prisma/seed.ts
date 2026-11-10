/* Seed data for Sagoon Driving School. Safe to re-run: uses upserts. Run with `npm run db:seed`. */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { POSTS } from "./seed-content/posts";
import { FAQS } from "./seed-content/faqs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const SUBURBS = [
  "Rockdale", "Arncliffe", "Banksia", "Bexley", "Bexley North", "Brighton-Le-Sands", "Carlton", "Kogarah",
  "Kyeemagh", "Monterey", "Ramsgate", "Sans Souci", "Turrella", "Wolli Creek", "Bardwell Park", "Kingsgrove",
];

// NSW public holidays (verify each year at nsw.gov.au/about-nsw/public-holidays).
const HOLIDAYS: [string, string][] = [
  ["2026-12-25", "Christmas Day"], ["2026-12-26", "Boxing Day"], ["2026-12-28", "Boxing Day (additional day)"],
  ["2027-01-01", "New Year's Day"], ["2027-01-26", "Australia Day"], ["2027-03-26", "Good Friday"],
  ["2027-03-27", "Easter Saturday"], ["2027-03-28", "Easter Sunday"], ["2027-03-29", "Easter Monday"],
  ["2027-04-25", "Anzac Day"], ["2027-06-14", "King's Birthday"], ["2027-10-04", "Labour Day"],
  ["2027-12-25", "Christmas Day"], ["2027-12-26", "Boxing Day"], ["2027-12-27", "Christmas Day (additional day)"],
  ["2027-12-28", "Boxing Day (additional day)"],
];

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, suburbs: SUBURBS } });

  let instructor = await prisma.instructor.findFirst();
  if (!instructor) {
    instructor = await prisma.instructor.create({
      data: {
        name: "Your Instructor",
        bio: "Replace this with your story: how long you've been teaching, why you love helping nervous learners, and what students say about your calm, patient style. (Edit in Admin → Settings.)",
        accreditation: "NSW Driving Instructor Licence — add your licence number",
        languages: ["English", "Nepali", "Hindi"],
      },
    });
    const hours = [1, 2, 3, 4, 5].map((weekday) => ({ instructorId: instructor!.id, weekday, startMin: 7 * 60, endMin: 19 * 60 }));
    hours.push({ instructorId: instructor.id, weekday: 6, startMin: 8 * 60, endMin: 16 * 60 });
    await prisma.workingHours.createMany({ data: hours });
  }

  if (!(await prisma.vehicle.count())) {
    await prisma.vehicle.create({
      data: {
        name: "Toyota Corolla Hybrid Hatch (automatic)",
        transmission: "Automatic",
        features: ["Dual controls", "5-star ANCAP safety rating", "Reversing camera", "Air-conditioned", "Fully insured for learners"],
      },
    });
  }

  const lessonTypes = [
    { slug: "lesson-60", name: "1-hour lesson", kind: "LESSON", durationMins: 60, priceCents: 7500, sortOrder: 1, popular: false, description: "Perfect for regular practice and building skills step by step." },
    { slug: "lesson-90", name: "1.5-hour lesson", kind: "LESSON", durationMins: 90, priceCents: 11000, sortOrder: 2, popular: true, description: "Our most popular length — time to warm up, learn something new and practise it." },
    { slug: "lesson-120", name: "2-hour lesson", kind: "LESSON", durationMins: 120, priceCents: 14500, sortOrder: 3, popular: false, description: "Great for longer drives, highway practice and test-route preparation." },
    { slug: "driving-test-package", name: "Driving Test package", kind: "TEST_PACKAGE", durationMins: 150, priceCents: 23000, sortOrder: 4, popular: false, description: "Pickup, 1-hour warm-up lesson, use of our dual-control car for your Service NSW driving test, and drop-off." },
    { slug: "overseas-refresher", name: "Overseas licence refresher", kind: "REFRESHER", durationMins: 90, priceCents: 11000, sortOrder: 5, popular: false, description: "For experienced drivers converting an overseas licence: NSW road rules, test standards and local habits." },
    { slug: "confidence-lesson", name: "Confidence & senior refresher", kind: "CONFIDENCE", durationMins: 60, priceCents: 7500, sortOrder: 6, popular: false, description: "Gentle, judgement-free lessons for anxious drivers, returning drivers and seniors." },
  ] as const;
  for (const lt of lessonTypes) await prisma.lessonType.upsert({ where: { slug: lt.slug }, update: {}, create: lt });

  const packages = [
    { slug: "pack-5", name: "5-lesson pack", lessonCount: 5, lessonDurationMins: 60, priceCents: 35000, sortOrder: 1, popular: false, description: "A great start for new learners.", features: ["5 × 1-hour lessons", "Save $25", "Credits never expire", "Logbook-eligible lessons"] },
    { slug: "pack-10", name: "10-lesson pack", lessonCount: 10, lessonDurationMins: 60, priceCents: 68000, sortOrder: 2, popular: true, description: "Our best value — maximise your logbook bonus hours.", features: ["10 × 1-hour lessons", "Save $70", "Counts as up to 30 logbook hours", "Free progress report"] },
    { slug: "pack-overseas", name: "Overseas fast-track", lessonCount: 3, lessonDurationMins: 90, priceCents: 31500, sortOrder: 3, popular: false, description: "Three 1.5-hour lessons to get experienced drivers test-ready in NSW.", features: ["3 × 1.5-hour lessons", "Save $15", "Mock test on local test routes", "NSW road-rule refresher"] },
  ];
  for (const p of packages) await prisma.package.upsert({ where: { slug: p.slug }, update: {}, create: p });

  const promos = [
    { code: "STUDENT10", description: "10% off for high-school and university students (show student ID)", kind: "PERCENT", value: 10 },
    { code: "PENSIONER10", description: "10% off for pensioners and seniors card holders", kind: "PERCENT", value: 10 },
    { code: "FRIEND15", description: "$15 off your first lesson when referred by a friend", kind: "FIXED", value: 1500 },
  ] as const;
  for (const p of promos) await prisma.promoCode.upsert({ where: { code: p.code }, update: {}, create: p });

  for (const [date, name] of HOLIDAYS) await prisma.publicHoliday.upsert({ where: { date }, update: { name }, create: { date, name } });

  for (const p of POSTS) {
    await prisma.post.upsert({
      where: { slug: p.slug },
      update: { title: p.title, excerpt: p.excerpt, content: p.content, category: p.category, readMins: p.readMins },
      create: { ...p, publishedAt: new Date() },
    });
  }

  if (!(await prisma.faq.count())) {
    await prisma.faq.createMany({ data: FAQS.map((f, i) => ({ ...f, sortOrder: i })) });
  }

  if (!(await prisma.testimonial.count())) {
    // SAMPLE reviews — unpublished. Australian Consumer Law prohibits fake reviews:
    // replace these with real student feedback before publishing them.
    await prisma.testimonial.createMany({
      data: [
        { name: "Sample — Priya S.", suburb: "Rockdale", rating: 5, quote: "I was terrified of driving but every lesson felt calm and patient. Passed first go!", published: false },
        { name: "Sample — Daniel K.", suburb: "Kogarah", rating: 5, quote: "Booking online was so easy and the reminders meant I never missed a lesson.", published: false },
        { name: "Sample — Mei L.", suburb: "Arncliffe", rating: 5, quote: "Converted my overseas licence after just two refresher lessons. Clear tips on what the testers look for.", published: false },
      ],
    });
  }

  console.log("✔ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
