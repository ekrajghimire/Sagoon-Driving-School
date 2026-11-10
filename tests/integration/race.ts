/* Integration check: many simultaneous bookings for the same / overlapping times → exactly one wins.
   Run against a DEV database only:  npx tsx --conditions=react-server tests/integration/race.ts */
import "dotenv/config";
import { createBooking, cancelBooking, getAvailability } from "@/lib/booking-service";
import { prisma } from "@/lib/db";

async function main() {
  const lt = await prisma.lessonType.findFirstOrThrow({ where: { slug: "lesson-60" } });
  const date = "2026-12-02"; // a Wednesday with nothing booked
  // Same hour ×3, plus the hours either side (which would touch it with no travel gap).
  const attempts = [540, 540, 540, 600, 480, 540].map((startMin, i) =>
    createBooking({
      date, startMin, lessonTypeId: lt.id,
      customerName: `Race Tester ${i}`, customerEmail: `race${i}@example.com`, customerPhone: "0400000000",
      pickupAddress: "1 Test St", pickupSuburb: "Rockdale",
    }).then((b) => ({ ok: true as const, id: b.id, startMin }), (e) => ({ ok: false as const, msg: String(e.message), startMin })),
  );
  const results = await Promise.all(attempts);
  const wins = results.filter((r) => r.ok);
  console.log(results.map((r) => `${r.startMin}: ${r.ok ? "BOOKED" : "refused — " + r.msg}`).join("\n"));
  console.log(`\nWinners: ${wins.length} (expected 1)`);
  const { slots } = await getAvailability(date, 60);
  console.log("Slots now offered around winner:", slots.filter((s) => s.startMin >= 420 && s.startMin <= 720).map((s) => s.label).join(", "));
  // clean up
  for (const w of wins) if (w.ok) await cancelBooking(w.id, { byStaff: true, reason: "test cleanup" });
  await prisma.booking.deleteMany({ where: { customerEmail: { startsWith: "race" } } });
  if (wins.length !== 1) process.exit(1);
}
main().finally(() => prisma.$disconnect());
