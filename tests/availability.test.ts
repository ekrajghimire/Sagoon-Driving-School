import { describe, expect, it } from "vitest";
import { generateSlots, type AvailabilityInput } from "../src/lib/availability";
import { sydneyToUtc, fmtSydney } from "../src/lib/time";

const base = (over: Partial<AvailabilityInput> = {}): AvailabilityInput => ({
  date: "2026-11-16", // Monday
  durationMins: 60,
  workingHours: [{ startMin: 7 * 60, endMin: 19 * 60 }],
  isHoliday: false,
  busy: [],
  bufferMins: 15,
  slotIntervalMins: 30,
  minNoticeHours: 12,
  maxAdvanceDays: 60,
  now: new Date("2026-11-10T00:00:00Z"),
  ...over,
});

describe("availability engine", () => {
  it("offers every half hour inside working hours", () => {
    const slots = generateSlots(base());
    expect(slots[0].label).toBe("7:00 AM");
    expect(slots.at(-1)!.label).toBe("6:00 PM"); // last 1-hour lesson ends at 7pm
    expect(slots).toHaveLength(23);
  });

  it("never offers a time overlapping an existing booking plus travel buffer", () => {
    const busy = [{ start: sydneyToUtc("2026-11-16", 600), end: sydneyToUtc("2026-11-16", 660), source: "booking" as const }]; // 10–11am
    const labels = generateSlots(base({ busy })).map((s) => s.label);
    expect(labels).not.toContain("9:00 AM"); // would end 10:00, inside 15-min buffer
    expect(labels).not.toContain("10:00 AM");
    expect(labels).not.toContain("10:30 AM");
    expect(labels).not.toContain("11:00 AM"); // starts inside buffer after
    expect(labels).toContain("8:30 AM"); // ends 9:30, clear of 9:45 buffer
    expect(labels).toContain("11:30 AM");
  });

  it("blocks Google Calendar events", () => {
    const busy = [{ start: sydneyToUtc("2026-11-16", 13 * 60), end: sydneyToUtc("2026-11-16", 15 * 60), source: "google" as const }];
    const labels = generateSlots(base({ busy })).map((s) => s.label);
    expect(labels).not.toContain("1:00 PM");
    expect(labels).not.toContain("2:30 PM");
    expect(labels).toContain("11:30 AM");
  });

  it("returns nothing on public holidays and past/too-far dates", () => {
    expect(generateSlots(base({ isHoliday: true }))).toHaveLength(0);
    expect(generateSlots(base({ date: "2026-11-01" }))).toHaveLength(0);
    expect(generateSlots(base({ date: "2027-03-01" }))).toHaveLength(0);
  });

  it("respects minimum notice", () => {
    // now = Mon 16 Nov 6:00am Sydney (AEDT, UTC+11) → earliest 6:00pm
    const slots = generateSlots(base({ now: new Date("2026-11-15T19:00:00Z") }));
    expect(slots.map((s) => s.label)).toEqual(["6:00 PM"]);
  });

  it("handles daylight saving start (5 Oct 2025) — 9am is 9am local", () => {
    const s = generateSlots(base({ date: "2025-10-05", now: new Date("2025-09-01T00:00:00Z"), workingHours: [{ startMin: 540, endMin: 600 }] }));
    expect(s).toHaveLength(1);
    expect(fmtSydney(s[0].start, "HH:mm xxx")).toBe("09:00 +11:00");
    expect(s[0].start.toISOString()).toBe("2025-10-04T22:00:00.000Z");
  });

  it("handles daylight saving end (5 Apr 2026)", () => {
    const s = generateSlots(base({ date: "2026-04-05", now: new Date("2026-03-01T00:00:00Z"), workingHours: [{ startMin: 540, endMin: 600 }] }));
    expect(fmtSydney(s[0].start, "HH:mm xxx")).toBe("09:00 +10:00");
    expect(s[0].start.toISOString()).toBe("2026-04-04T23:00:00.000Z");
  });

  it("supports 1.5 and 2 hour lessons", () => {
    expect(generateSlots(base({ durationMins: 120 })).at(-1)!.label).toBe("5:00 PM");
    expect(generateSlots(base({ durationMins: 90 })).at(-1)!.label).toBe("5:30 PM");
  });
});

import { generateSlotGrid } from "../src/lib/availability";
describe("slot grid (dimmed times)", () => {
  it("keeps taken and too-soon times in the list, marked unavailable", () => {
    const busy = [{ start: sydneyToUtc("2026-11-16", 600), end: sydneyToUtc("2026-11-16", 660), source: "booking" as const }];
    const grid = generateSlotGrid(base({ busy, now: new Date("2026-11-15T19:00:00Z"), minNoticeHours: 2 })); // now = 6am Sydney
    expect(grid).toHaveLength(23); // every half hour 7:00–18:00 still listed
    const byLabel = Object.fromEntries(grid.map((g) => [g.label, g]));
    expect(byLabel["7:30 AM"]).toMatchObject({ available: false, reason: "too_soon" });
    expect(byLabel["10:00 AM"]).toMatchObject({ available: false, reason: "booked" });
    expect(byLabel["11:30 AM"]).toMatchObject({ available: true });
  });
  it("is empty on closed days", () => {
    expect(generateSlotGrid(base({ isHoliday: true }))).toHaveLength(0);
  });
});

import { mergeIntoBlocks, splitParts } from "../src/lib/lesson-parts";
describe("split lessons", () => {
  it("only whole-hour standard lessons of 2h+ can be split", () => {
    expect(splitParts("LESSON", 120)).toBe(2);
    expect(splitParts("LESSON", 90)).toBe(1);
    expect(splitParts("LESSON", 60)).toBe(1);
    expect(splitParts("TEST_PACKAGE", 120)).toBe(1);
  });
  it("merges back-to-back picks and keeps separate days apart", () => {
    expect(mergeIntoBlocks([{ date: "2026-11-18", startMin: 540 }, { date: "2026-11-18", startMin: 480 }], 60)).toEqual([{ date: "2026-11-18", startMin: 480, durationMins: 120 }]);
    expect(mergeIntoBlocks([{ date: "2026-11-19", startMin: 480 }, { date: "2026-11-18", startMin: 480 }], 60)).toEqual([
      { date: "2026-11-18", startMin: 480, durationMins: 60 },
      { date: "2026-11-19", startMin: 480, durationMins: 60 },
    ]);
    expect(mergeIntoBlocks([{ date: "2026-11-18", startMin: 480 }, { date: "2026-11-18", startMin: 510 }], 60)).toBeNull();
  });
});

import { isIsoDate } from "../src/lib/time";
describe("date validation", () => {
  it("rejects impossible dates", () => {
    expect(isIsoDate("2026-11-18")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("18/11/2026")).toBe(false);
  });
});

import { safeNext } from "../src/lib/safe-next";
describe("login redirect safety", () => {
  it("keeps on-site paths and rejects other sites", () => {
    expect(safeNext("/account/packages?buy=pack-10")).toBe("/account/packages?buy=pack-10");
    expect(safeNext("/admin")).toBe("/admin");
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "/\\/evil.com", "javascript:alert(1)", "/%0a/evil", ""]) {
      expect(["/account", "/%0a/evil"]).toContain(safeNext(bad));
    }
  });
});
