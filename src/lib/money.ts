const fmt = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" });
const fmt0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

/** Format cents as AUD, e.g. 7500 → "$75.00". */
export function aud(cents: number, opts: { round?: boolean } = {}) {
  const v = cents / 100;
  return opts.round && Number.isInteger(v) ? fmt0.format(v) : fmt.format(v);
}

/** GST component of a GST-inclusive price (1/11th in Australia). */
export function gstOf(cents: number) {
  return Math.round(cents / 11);
}

export function applyPromo(priceCents: number, promo: { kind: "PERCENT" | "FIXED"; value: number } | null) {
  if (!promo) return 0;
  const d = promo.kind === "PERCENT" ? Math.round((priceCents * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(priceCents, d));
}
