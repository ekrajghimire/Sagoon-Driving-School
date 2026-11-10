import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { aud } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader } from "../_components/PageHeader";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { saveLessonType, deleteLessonType, savePackage, deletePackage, createPromo, generateGiftVoucher, togglePromo } from "../actions/pricing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing & promos" };

const KINDS = [
  ["LESSON", "Standard lesson"],
  ["TEST_PACKAGE", "Driving test package"],
  ["REFRESHER", "Overseas / refresher"],
  ["CONFIDENCE", "Confidence / senior"],
] as const;
const dollars = (c: number) => (c / 100).toFixed(2).replace(/\.00$/, "");

type LT = { id: string; name: string; description: string; kind: string; durationMins: number; priceCents: number; popular: boolean; active: boolean; sortOrder: number };
type PK = { id: string; name: string; description: string; lessonCount: number; lessonDurationMins: number; priceCents: number; features: string[]; popular: boolean; active: boolean; includesTest: boolean; sortOrder: number };

function LessonTypeForm({ l }: { l?: LT }) {
  return (
    <ActionForm action={saveLessonType} className="grid gap-3 sm:grid-cols-6">
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="sm:col-span-3"><label className="label">Name<input name="name" required defaultValue={l?.name} className="input mt-1" /></label></div>
      <div className="sm:col-span-3">
        <label className="label">Type
          <select name="kind" defaultValue={l?.kind ?? "LESSON"} className="input mt-1">{KINDS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        </label>
      </div>
      <div className="sm:col-span-6"><label className="label">Description<textarea name="description" rows={2} defaultValue={l?.description} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Duration (min)<input name="durationMins" type="number" min={30} max={300} step={15} required defaultValue={l?.durationMins ?? 60} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Price incl. GST ($)<input name="price" inputMode="decimal" required defaultValue={l ? dollars(l.priceCents) : ""} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Sort order<input name="sortOrder" type="number" min={0} defaultValue={l?.sortOrder ?? 10} className="input mt-1" /></label></div>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="popular" defaultChecked={l?.popular} /> “Most popular” badge</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={l?.active ?? true} /> Active (bookable)</label>
        <SubmitButton>{l ? "Save" : "Create lesson type"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function PackageForm({ p }: { p?: PK }) {
  return (
    <ActionForm action={savePackage} className="grid gap-3 sm:grid-cols-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="sm:col-span-6"><label className="label">Name<input name="name" required defaultValue={p?.name} className="input mt-1" /></label></div>
      <div className="sm:col-span-6"><label className="label">Description<textarea name="description" rows={2} defaultValue={p?.description} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Lessons<input name="lessonCount" type="number" min={1} max={100} required defaultValue={p?.lessonCount ?? 5} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Minutes each<input name="lessonDurationMins" type="number" min={30} max={240} step={15} required defaultValue={p?.lessonDurationMins ?? 60} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Total price incl. GST ($)<input name="price" inputMode="decimal" required defaultValue={p ? dollars(p.priceCents) : ""} className="input mt-1" /></label></div>
      <div className="sm:col-span-4"><label className="label">Features (one per line)<textarea name="features" rows={4} defaultValue={p?.features.join("\n")} className="input mt-1" /></label></div>
      <div className="sm:col-span-2"><label className="label">Sort order<input name="sortOrder" type="number" min={0} defaultValue={p?.sortOrder ?? 10} className="input mt-1" /></label></div>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="popular" defaultChecked={p?.popular} /> “Most popular”</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="includesTest" defaultChecked={p?.includesTest} /> Includes test</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> Active (for sale)</label>
        <SubmitButton>{p ? "Save" : "Create package"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function PricingAdmin() {
  await requireStaff(ADMINS);
  const [lessons, packages, promos] = await Promise.all([
    prisma.lessonType.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.package.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.promoCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <>
      <PageHeader title="Pricing & promos" subtitle="All prices are GST-inclusive. Changes appear on the website immediately." />

      <section aria-labelledby="lt-h">
        <h2 id="lt-h" className="text-xl font-extrabold">Lessons</h2>
        <div className="mt-3 space-y-2">
          {lessons.map((l) => (
            <details key={l.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{l.name} {!l.active && <span className="badge bg-slate-200 text-slate-600">inactive</span>} {l.popular && <span className="badge bg-accent text-ink">popular</span>}</span>
                <span className="text-sm text-muted">{l.durationMins} min · {aud(l.priceCents)}</span>
              </summary>
              <div className="mt-4 border-t border-line pt-4">
                <LessonTypeForm l={l} />
                <ActionForm action={deleteLessonType} className="mt-3">
                  <input type="hidden" name="id" value={l.id} />
                  <SubmitButton className="btn-danger btn-sm" confirm="Delete this lesson type? If it has bookings it will be deactivated instead.">Delete</SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
          <details className="card border-dashed p-4">
            <summary className="cursor-pointer font-bold text-brand-700">+ Add lesson type</summary>
            <div className="mt-4"><LessonTypeForm /></div>
          </details>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="pk-h">
        <h2 id="pk-h" className="text-xl font-extrabold">Packages</h2>
        <div className="mt-3 space-y-2">
          {packages.map((p) => (
            <details key={p.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{p.name} {!p.active && <span className="badge bg-slate-200 text-slate-600">inactive</span>} {p.popular && <span className="badge bg-accent text-ink">popular</span>}</span>
                <span className="text-sm text-muted">{p.lessonCount} × {p.lessonDurationMins} min · {aud(p.priceCents)}</span>
              </summary>
              <div className="mt-4 border-t border-line pt-4">
                <PackageForm p={p} />
                <ActionForm action={deletePackage} className="mt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="btn-danger btn-sm" confirm="Delete this package? If it has purchases it will be deactivated instead.">Delete</SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
          <details className="card border-dashed p-4">
            <summary className="cursor-pointer font-bold text-brand-700">+ Add package</summary>
            <div className="mt-4"><PackageForm /></div>
          </details>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="pr-h">
        <h2 id="pr-h" className="text-xl font-extrabold">Promo codes & gift vouchers</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="font-bold">Generate a gift voucher</h3>
            <p className="text-sm text-muted">Creates a single-use code like GIFT-7K2Q9M worth a fixed amount, valid for 3 years.</p>
            <ActionForm action={generateGiftVoucher} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnSuccess>
              <label className="label">Value ($)<input name="value" inputMode="decimal" required className="input mt-1" placeholder="150" /></label>
              <label className="label">For (optional)<input name="recipient" className="input mt-1" placeholder="Recipient name" /></label>
              <div className="sm:col-span-2"><SubmitButton className="btn-primary btn-sm">Generate voucher</SubmitButton></div>
            </ActionForm>
          </div>
          <div className="card">
            <h3 className="font-bold">Create a promo code</h3>
            <ActionForm action={createPromo} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnSuccess>
              <label className="label">Code<input name="code" required className="input mt-1 uppercase" placeholder="SCHOOL20" /></label>
              <label className="label">Type
                <select name="kind" className="input mt-1"><option value="PERCENT">% off</option><option value="FIXED">$ off</option></select>
              </label>
              <label className="label">Value (% or $)<input name="value" inputMode="decimal" required className="input mt-1" /></label>
              <label className="label">Max uses (blank = unlimited)<input name="maxUses" type="number" min={1} className="input mt-1" /></label>
              <label className="label">Expires (optional)<input name="expiresAt" type="date" className="input mt-1" /></label>
              <label className="label">Description (shown on pricing page)<input name="description" className="input mt-1" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isGiftVoucher" /> Gift voucher (hidden from pricing page)</label>
              <div className="sm:col-span-2"><SubmitButton className="btn-brand btn-sm">Create code</SubmitButton></div>
            </ActionForm>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
          <table className="table-x min-w-[640px]">
            <thead className="bg-surface"><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Expires</th><th>Description</th><th></th></tr></thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                  <td className="font-mono font-semibold">{p.code} {p.isGiftVoucher && <span className="badge ml-1 bg-brand-100 text-brand-800">gift</span>}</td>
                  <td>{p.kind === "PERCENT" ? `${p.value}%` : aud(p.value)}</td>
                  <td>{p.uses}{p.maxUses != null ? ` / ${p.maxUses}` : ""}</td>
                  <td>{p.expiresAt ? fmtDate(p.expiresAt) : "—"}</td>
                  <td>{p.description}</td>
                  <td>
                    <ActionForm action={togglePromo} hideSuccess>
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton className="btn-ghost btn-sm">{p.active ? "Deactivate" : "Activate"}</SubmitButton>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
