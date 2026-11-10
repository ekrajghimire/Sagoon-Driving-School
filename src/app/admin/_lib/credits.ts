/**
 * Remaining package credits for a customer, plus the lesson length of the package the next credit comes from.
 * Mirrors createBooking(): it redeems from the OLDEST PAID / PENDING_PAYMENT purchase that still has credits,
 * so `purchases` must be those purchases ordered by createdAt ascending.
 */
export function creditSummary(purchases: { creditsTotal: number; creditsUsed: number; package: { lessonDurationMins: number } }[]) {
  const credits = purchases.reduce((n, p) => n + Math.max(0, p.creditsTotal - p.creditsUsed), 0);
  const next = purchases.find((p) => p.creditsUsed < p.creditsTotal);
  return { credits, creditDurationMins: next?.package.lessonDurationMins ?? 60 };
}
