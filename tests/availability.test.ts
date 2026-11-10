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
    expect(slots[0].label).toBe("7:00am");
    expect(slots.at(-1)!.label).toBe("6:00pm"); // last 1-hour lesson ends at 7pm
    expect(slots).toHaveLength(23);
  });

  it("never offers a time overlapping an existing booking plus travel buffer", () => {
    const busy = [{ start: sydneyToUtc("2026-11-16", 600), end: sydneyToUtc("2026-11-16", 660), source: "booking" as const }]; // 10–11am
    const labels = generateSlots(base({ busy })).map((s) => s.label);
    expect(labels).not.toContain("9:00am"); // would end 10:00, inside 15-min buffer
    expect(labels).not.toContain("10:00am");
    expect(labels).not.toContain("10:30am");
    expect(labels).not.toContain("11:00am"); // starts inside buffer after
    expect(labels).toContain("8:30am"); // ends 9:30, clear of 9:45 buffer
    expect(labels).toContain("11:30am");
  });

  it("blocks Google Calendar events", () => {
    const busy = [{ start: sydneyToUtc("2026-11-16", 13 * 60), end: sydneyToUtc("2026-11-16", 15 * 60), source: "google" as const }];
    const labels = generateSlots(base({ busy })).map((s) => s.label);
    expect(labels).not.toContain("1:00pm");
    expect(labels).not.toContain("2:30pm");
    expect(labels).toContain("11:30am");
  });

  it("returns nothing on public holidays and past/too-far dates", () => {
    expect(generateSlots(base({ isHoliday: true }))).toHaveLength(0);
    expect(generateSlots(base({ date: "2026-11-01" }))).toHaveLength(0);
    expect(generateSlots(base({ date: "2027-03-01" }))).toHaveLength(0);
  });

  it("respects minimum notice", () => {
    // now = Mon 16 Nov 6:00am Sydney (AEDT, UTC+11) → earliest 6:00pm
    const slots = generateSlots(base({ now: new Date("2026-11-15T19:00:00Z") }));
    expect(slots.map((s) => s.label)).toEqual(["6:00pm"]);
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
    expect(generateSlots(base({ durationMins: 120 })).at(-1)!.label).toBe("5:00pm");
    expect(generateSlots(base({ durationMins: 90 })).at(-1)!.label).toBe("5:30pm");
  });
});
