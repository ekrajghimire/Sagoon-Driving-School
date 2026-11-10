/**
 * Split lessons. A standard lesson that is a whole number of hours (2 hours or more) can be
 * booked as separate 1-hour sessions, on the same day or different days — the customer picks
 * one 1-hour time slot per hour. Back-to-back picks on the same day become one continuous lesson.
 * Other lessons (1.5-hour, test package, refresher…) are always one continuous block.
 * Safe to import in client components.
 */
export const SPLIT_UNIT_MINS = 60;

export function splitParts(kind: string, durationMins: number) {
  return kind === "LESSON" && durationMins > SPLIT_UNIT_MINS && durationMins % SPLIT_UNIT_MINS === 0
    ? durationMins / SPLIT_UNIT_MINS
    : 1;
}

export type PickedSlot = { date: string; startMin: number };
export type Block = { date: string; startMin: number; durationMins: number };

/** Sort picks and merge back-to-back ones on the same day into continuous blocks. Returns null if picks overlap. */
export function mergeIntoBlocks(picks: PickedSlot[], unitMins: number): Block[] | null {
  const sorted = [...picks].sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1));
  const blocks: Block[] = [];
  for (const p of sorted) {
    const last = blocks.at(-1);
    if (last && last.date === p.date) {
      const lastEnd = last.startMin + last.durationMins;
      if (p.startMin < lastEnd) return null; // overlapping picks
      if (p.startMin === lastEnd) {
        last.durationMins += unitMins;
        continue;
      }
    }
    blocks.push({ date: p.date, startMin: p.startMin, durationMins: unitMins });
  }
  return blocks;
}
