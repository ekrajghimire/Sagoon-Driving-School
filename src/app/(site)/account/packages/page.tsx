import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { aud } from "@/lib/money";
import { fmtDate, durationLabel } from "@/lib/time";
import { BuyPackageForm } from "./BuyPackageForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "My packages" };

const STATUS: Record<string, [string, string]> = {
  PENDING_PAYMENT: ["Payment due", "bg-amber-100 text-amber-900"],
  PAID: ["Paid", "bg-green-100 text-ok"],
  CANCELLED: ["Cancelled", "bg-red-100 text-danger"],
  REFUNDED: ["Refunded", "bg-surface text-muted"],
};

export default async function PackagesPage({ searchParams }: { searchParams: Promise<{ buy?: string; ordered?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser(`/account/packages${sp.buy ? `?buy=${encodeURIComponent(sp.buy)}` : ""}`);
  const [purchases, toBuy] = await Promise.all([
    prisma.packagePurchase.findMany({ where: { userId: user.id }, include: { package: true }, orderBy: { createdAt: "desc" } }),
    sp.buy ? prisma.package.findFirst({ where: { slug: sp.buy, active: true } }) : null,
  ]);

  return (
    <div className="space-y-6">
      {sp.ordered && (
        <p className="rounded-xl bg-green-50 p-4 font-semibold text-ok" role="status">
          Package added! You can <Link href="/book" className="underline">book your lessons</Link> now.
        </p>
      )}
      {toBuy && (
        <section className="card border-2 border-brand-700">
          <h2 className="text-xl font-bold">{toBuy.name}</h2>
          <p className="text-sm text-muted">{toBuy.lessonCount} × {durationLabel(toBuy.lessonDurationMins)} lessons · {aud(toBuy.priceCents)} incl. GST</p>
          <ul className="mt-2 list-disc pl-5 text-sm">{toBuy.features.map((f) => <li key={f}>{f}</li>)}</ul>
          <BuyPackageForm slug={toBuy.slug} name={toBuy.name} price={aud(toBuy.priceCents)} />
        </section>
      )}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">Your packages</h2>
          <Link href="/pricing#packages" className="btn-outline btn-sm">Browse packages</Link>
        </div>
        {purchases.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-center text-muted">No packages yet. Packages save you money on every lesson.</p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {purchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold">{p.package.name} <span className={`badge ml-1 ${STATUS[p.status][1]}`}>{STATUS[p.status][0]}</span></p>
                  <p className="text-sm text-muted">Ordered {fmtDate(p.createdAt)} · ref {p.ref} · {aud(p.priceCents - p.discountCents)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm"><strong className="text-lg">{p.creditsTotal - p.creditsUsed}</strong> of {p.creditsTotal} left</p>
                  <Link href={`/invoice/purchase/${p.id}`} className="btn-ghost btn-sm">Invoice</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
