import { ChevronRight, Gift, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { aud } from "@/lib/money";
import { fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader, EmptyState, SectionTitle } from "../_components/PageHeader";
import { StatusBadge } from "../_components/StatusBadge";
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
const money = { inputMode: "decimal" as const, pattern: "\\$?\\d+(\\.\\d{1,2})?", title: "Dollars, e.g. 75 or 75.50" };
const check = "flex min-h-11 items-center gap-2 text-sm";

type LT = { id: string; name: string; description: string; kind: string; durationMins: number; priceCents: number; popular: boolean; active: boolean; sortOrder: number };
type PK = { id: string; name: string; description: string; lessonCount: number; lessonDurationMins: number; priceCents: number; features: string[]; popular: boolean; active: boolean; includesTest: boolean; sortOrder: number };

function LessonTypeForm({ l }: { l?: LT }) {
  return (
    <ActionForm action={saveLessonType} className="grid gap-3 sm:grid-cols-6" resetOnSuccess={!l}>
      {l && <input type="hidden" name="id" value={l.id} />}
      <label className="label sm:col-span-3">
        Name
        <input name="name" required minLength={2} maxLength={80} defaultValue={l?.name} className="input mt-1" />
      </label>
      <label className="label sm:col-span-3">
        Type
        <select name="kind" defaultValue={l?.kind ?? "LESSON"} className="input mt-1">
          {KINDS.map(([v, t]) => (
            <option key={v} value={v}>{t}</option>
          ))}
        </select>
      </label>
      <label className="label sm:col-span-6">
        Description
        <textarea name="description" rows={2} maxLength={500} defaultValue={l?.description} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Duration (min)
        <input name="durationMins" type="number" inputMode="numeric" min={30} max={300} step={15} required defaultValue={l?.durationMins ?? 60} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Price incl. GST ($)
        <input name="price" {...money} required defaultValue={l ? dollars(l.priceCents) : ""} placeholder="75" className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Sort order
        <input name="sortOrder" type="number" inputMode="numeric" min={0} max={999} defaultValue={l?.sortOrder ?? 10} className="input mt-1" />
      </label>
      <div className="flex flex-wrap items-center gap-x-5 sm:col-span-6">
        <label className={check}>
          <input type="checkbox" name="popular" defaultChecked={l?.popular} className="size-5" /> “Most popular” badge
        </label>
        <label className={check}>
          <input type="checkbox" name="active" defaultChecked={l?.active ?? true} className="size-5" /> Active (bookable)
        </label>
      </div>
      <div className="sm:col-span-6">
        <SubmitButton>{l ? "Save changes" : "Create lesson type"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function PackageForm({ p }: { p?: PK }) {
  return (
    <ActionForm action={savePackage} className="grid gap-3 sm:grid-cols-6" resetOnSuccess={!p}>
      {p && <input type="hidden" name="id" value={p.id} />}
      <label className="label sm:col-span-6">
        Name
        <input name="name" required minLength={2} maxLength={80} defaultValue={p?.name} className="input mt-1" />
      </label>
      <label className="label sm:col-span-6">
        Description
        <textarea name="description" rows={2} maxLength={500} defaultValue={p?.description} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Lessons
        <input name="lessonCount" type="number" inputMode="numeric" min={1} max={100} required defaultValue={p?.lessonCount ?? 5} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Minutes each
        <input name="lessonDurationMins" type="number" inputMode="numeric" min={30} max={240} step={15} required defaultValue={p?.lessonDurationMins ?? 60} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Total price incl. GST ($)
        <input name="price" {...money} required defaultValue={p ? dollars(p.priceCents) : ""} placeholder="350" className="input mt-1" />
      </label>
      <label className="label sm:col-span-4">
        Features (one per line)
        <textarea name="features" rows={4} defaultValue={p?.features.join("\n")} className="input mt-1" />
      </label>
      <label className="label sm:col-span-2">
        Sort order
        <input name="sortOrder" type="number" inputMode="numeric" min={0} max={999} defaultValue={p?.sortOrder ?? 10} className="input mt-1" />
      </label>
      <div className="flex flex-wrap items-center gap-x-5 sm:col-span-6">
        <label className={check}>
          <input type="checkbox" name="popular" defaultChecked={p?.popular} className="size-5" /> “Most popular”
        </label>
        <label className={check}>
          <input type="checkbox" name="includesTest" defaultChecked={p?.includesTest} className="size-5" /> Includes test
        </label>
        <label className={check}>
          <input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="size-5" /> Active (for sale)
        </label>
      </div>
      <div className="sm:col-span-6">
        <SubmitButton>{p ? "Save changes" : "Create package"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

function Summary({ title, meta, badges }: { title: string; meta: string; badges: React.ReactNode }) {
  return (
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 flex-1">
        <span className="font-bold">{title}</span> {badges}
        <span className="block text-sm text-muted">{meta}</span>
      </span>
      <span className="hidden text-sm font-semibold text-brand-700 sm:inline group-open:hidden">Edit</span>
      <ChevronRight className="size-5 shrink-0 text-muted transition group-open:rotate-90" aria-hidden />
    </summary>
  );
}

export default async function PricingAdmin() {
  await requireStaff(ADMINS);
  const [lessons, packages, promos] = await Promise.all([
    prisma.lessonType.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.package.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.promoCode.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }], take: 200 }),
  ]);
  const now = new Date();
  const promoState = (p: (typeof promos)[number]) =>
    !p.active ? "INACTIVE" : p.expiresAt && p.expiresAt < now ? "EXPIRED" : p.maxUses != null && p.uses >= p.maxUses ? "USED_UP" : "ACTIVE";

  return (
    <>
      <PageHeader title="Pricing & promos" subtitle="All prices are GST-inclusive. Changes appear on the website immediately." />

      <section aria-labelledby="lt-h">
        <SectionTitle id="lt-h">Lessons</SectionTitle>
        <div className="space-y-2">
          {lessons.map((l) => (
            <details key={l.id} className={`group card p-4 ${l.active ? "" : "bg-surface/60"}`}>
              <Summary
                title={l.name}
                meta={`${l.durationMins} min · ${aud(l.priceCents)}`}
                badges={
                  <>
                    {!l.active && <StatusBadge status="INACTIVE" />} {l.popular && <span className="badge bg-accent text-ink">Popular</span>}
                  </>
                }
              />
              <div className="mt-4 border-t border-line pt-4">
                <LessonTypeForm l={l} />
                <ActionForm action={deleteLessonType} className="mt-4 border-t border-dashed border-line pt-3">
                  <input type="hidden" name="id" value={l.id} />
                  <SubmitButton className="btn-danger btn-sm" confirm={`Delete “${l.name}”? If it has bookings it will be deactivated instead.`}>
                    Delete lesson type
                  </SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
          {!lessons.length && <EmptyState title="No lesson types yet">Customers can&apos;t book online until you add one.</EmptyState>}
          <details className="group card border-dashed p-4" open={!lessons.length || undefined}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand-700 [&::-webkit-details-marker]:hidden">
              <Plus className="size-4" aria-hidden /> Add lesson type
            </summary>
            <div className="mt-4">
              <LessonTypeForm />
            </div>
          </details>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="pk-h">
        <SectionTitle id="pk-h">Packages</SectionTitle>
        <div className="space-y-2">
          {packages.map((p) => (
            <details key={p.id} className={`group card p-4 ${p.active ? "" : "bg-surface/60"}`}>
              <Summary
                title={p.name}
                meta={`${p.lessonCount} × ${p.lessonDurationMins} min · ${aud(p.priceCents)}`}
                badges={
                  <>
                    {!p.active && <StatusBadge status="INACTIVE" />} {p.popular && <span className="badge bg-accent text-ink">Popular</span>}
                  </>
                }
              />
              <div className="mt-4 border-t border-line pt-4">
                <PackageForm p={p} />
                <ActionForm action={deletePackage} className="mt-4 border-t border-dashed border-line pt-3">
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="btn-danger btn-sm" confirm={`Delete “${p.name}”? If it has purchases it will be deactivated instead.`}>
                    Delete package
                  </SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
          <details className="group card border-dashed p-4">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand-700 [&::-webkit-details-marker]:hidden">
              <Plus className="size-4" aria-hidden /> Add package
            </summary>
            <div className="mt-4">
              <PackageForm />
            </div>
          </details>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="pr-h">
        <SectionTitle id="pr-h">Promo codes &amp; gift vouchers</SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card">
            <h3 className="flex items-center gap-2 font-bold">
              <Gift className="size-5 text-brand-700" aria-hidden /> Generate a gift voucher
            </h3>
            <p className="text-sm text-muted">Creates a single-use code like GIFT-7K2Q9M worth a fixed amount, valid for 3 years.</p>
            <ActionForm action={generateGiftVoucher} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnSuccess>
              <label className="label">
                Value ($)
                <input name="value" {...money} required className="input mt-1" placeholder="150" />
              </label>
              <label className="label">
                For <span className="font-normal text-muted">(optional)</span>
                <input name="recipient" maxLength={100} className="input mt-1" placeholder="Recipient name" />
              </label>
              <div className="sm:col-span-2">
                <SubmitButton className="btn-primary btn-sm">Generate voucher</SubmitButton>
              </div>
            </ActionForm>
          </div>
          <div className="card">
            <h3 className="font-bold">Create a promo code</h3>
            <ActionForm action={createPromo} className="mt-3 grid gap-3 sm:grid-cols-2" resetOnSuccess>
              <label className="label">
                Code
                <input name="code" required minLength={3} maxLength={30} pattern="[A-Za-z0-9\-\s]{3,30}" title="3–30 letters, numbers or dashes" autoCapitalize="characters" className="input mt-1 uppercase" placeholder="SCHOOL20" />
              </label>
              <label className="label">
                Type
                <select name="kind" className="input mt-1">
                  <option value="PERCENT">% off</option>
                  <option value="FIXED">$ off</option>
                </select>
              </label>
              <label className="label">
                Value (% or $)
                <input name="value" inputMode="decimal" required className="input mt-1" placeholder="10" />
              </label>
              <label className="label">
                Max uses <span className="font-normal text-muted">(blank = unlimited)</span>
                <input name="maxUses" type="number" inputMode="numeric" min={1} className="input mt-1" />
              </label>
              <label className="label">
                Expires <span className="font-normal text-muted">(optional)</span>
                <input name="expiresAt" type="date" className="input mt-1" />
              </label>
              <label className="label">
                Description <span className="font-normal text-muted">(shown on pricing page)</span>
                <input name="description" maxLength={200} className="input mt-1" />
              </label>
              <label className={`${check} sm:col-span-2`}>
                <input type="checkbox" name="isGiftVoucher" className="size-5" /> Gift voucher (hidden from pricing page)
              </label>
              <div className="sm:col-span-2">
                <SubmitButton className="btn-brand btn-sm">Create code</SubmitButton>
              </div>
            </ActionForm>
          </div>
        </div>

        {promos.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No promo codes yet" />
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {promos.map((p) => {
              const state = promoState(p);
              return (
                <li key={p.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${state === "ACTIVE" ? "" : "bg-surface/60"}`}>
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-mono font-bold">
                      {p.code} {p.isGiftVoucher && <span className="badge ml-1 bg-brand-100 font-sans text-brand-800">Gift</span>}
                    </p>
                    <p className="text-sm">
                      <strong>{p.kind === "PERCENT" ? `${p.value}% off` : `${aud(p.value)} off`}</strong>
                      <span className="text-muted">
                        {" "}
                        · used {p.uses}
                        {p.maxUses != null ? ` of ${p.maxUses}` : ""}
                        {p.expiresAt ? ` · until ${fmtDate(p.expiresAt)}` : ""}
                      </span>
                    </p>
                    {p.description && <p className="truncate text-xs text-muted">{p.description}</p>}
                  </div>
                  <StatusBadge status={state} />
                  <ActionForm action={togglePromo} hideSuccess>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton className="btn-ghost btn-sm" confirm={p.active ? `Deactivate ${p.code}? Customers won't be able to use it.` : undefined}>
                      {p.active ? "Deactivate" : "Reactivate"}
                    </SubmitButton>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
