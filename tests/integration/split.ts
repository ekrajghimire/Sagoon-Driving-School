/* Integration check for split lessons. DEV database only:
   npx tsx --conditions=react-server tests/integration/split.ts */
import "dotenv/config";
import { createBookingGroup } from "@/lib/booking-service";
import { prisma } from "@/lib/db";

const who = (n: string) => ({ customerName: `Split ${n}`, customerEmail: `split-${n}@example.com`, customerPhone: "0400000000", pickupAddress: "1 Test St", pickupSuburb: "Rockdale" });
const tryBook = (p: Parameters<typeof createBookingGroup>[0]) => createBookingGroup(p).then((b) => b, (e: Error) => e.message);

async function main() {
  const lt = await prisma.lessonType.findFirstOrThrow({ where: { slug: "lesson-120" } });
  let fail = 0;
  const check = (ok: boolean, msg: string) => { console.log(`${ok ? "✔" : "✘"} ${msg}`); if (!ok) fail++; };

  // 1. Two different days
  const a = await tryBook({ ...who("a"), lessonTypeId: lt.id, date: "", startMin: 0, slots: [{ date: "2026-11-25", startMin: 600 }, { date: "2026-11-24", startMin: 480 }] });
  check(Array.isArray(a) && a.length === 2 && !!a[0].groupRef && a[0].groupRef === a[1].groupRef, "2-hour lesson on two days → 2 linked bookings");
  if (Array.isArray(a)) check(a[0].priceCents + a[1].priceCents === lt.priceCents && a[0].durationMins === 60, `price split ${a[0].priceCents}+${a[1].priceCents} = ${lt.priceCents}, 1 hour each`);

  // 2. Back-to-back on one day → one continuous 2-hour booking
  const b = await tryBook({ ...who("b"), lessonTypeId: lt.id, date: "", startMin: 0, slots: [{ date: "2026-11-26", startMin: 540 }, { date: "2026-11-26", startMin: 600 }] });
  check(Array.isArray(b) && b.length === 1 && b[0].durationMins === 120 && !b[0].groupRef, "back-to-back picks → one 2-hour booking");

  // 3. Wrong number of picks / overlapping picks are refused
  const c = await tryBook({ ...who("c"), lessonTypeId: lt.id, date: "", startMin: 0, slots: [{ date: "2026-11-27", startMin: 540 }] });
  check(typeof c === "string" && c.includes("Please choose 2"), `one pick for a 2-hour lesson refused: "${c}"`);

  // 4. A part that clashes with someone else's lesson → whole booking refused, nothing half-saved
  const before = await prisma.booking.count();
  const d = await tryBook({ ...who("d"), lessonTypeId: lt.id, date: "", startMin: 0, slots: [{ date: "2026-11-27", startMin: 540 }, { date: "2026-11-24", startMin: 480 }] });
  check(typeof d === "string" && (await prisma.booking.count()) === before, `clash on one part refuses all parts: "${d}"`);

  // 5. Two people racing for the same hour in their split lessons → exactly one wins
  const race = await Promise.all(
    ["r1", "r2", "r3"].map((n, i) => tryBook({ ...who(n), lessonTypeId: lt.id, date: "", startMin: 0, slots: [{ date: "2026-11-30", startMin: 420 }, { date: "2026-12-01", startMin: 480 + i * 120 }] })),
  );
  check(race.filter(Array.isArray).length === 1, `race for the same hour: ${race.filter(Array.isArray).length} winner(s)`);

  await prisma.booking.deleteMany({ where: { customerEmail: { startsWith: "split-" } } });
  process.exit(fail ? 1 : 0);
}
main();
