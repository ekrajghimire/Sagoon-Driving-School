import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader, EmptyState } from "../_components/PageHeader";
import { StatusBadge } from "../_components/StatusBadge";
import { ActionForm } from "../_components/ActionForm";
import { SubmitButton } from "../_components/SubmitButton";
import { saveFaq, deleteFaq, saveTestimonial, deleteTestimonial } from "../actions/content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content" };

const TABS = [
  ["posts", "Learner tips & blog"],
  ["faqs", "FAQs"],
  ["testimonials", "Testimonials"],
] as const;

type Faq = { id: string; question: string; answer: string; category: string; sortOrder: number; published: boolean };
type Tm = { id: string; name: string; suburb: string; rating: number; quote: string; published: boolean };

function FaqForm({ f }: { f?: Faq }) {
  return (
    <ActionForm action={saveFaq} className="grid gap-3 sm:grid-cols-4" resetOnSuccess={!f}>
      {f && <input type="hidden" name="id" value={f.id} />}
      <label className="label sm:col-span-4">Question<input name="question" required minLength={5} maxLength={300} defaultValue={f?.question} className="input mt-1" /></label>
      <label className="label sm:col-span-4">Answer<textarea name="answer" rows={3} required minLength={5} maxLength={3000} defaultValue={f?.answer} className="input mt-1" /></label>
      <label className="label sm:col-span-2">Category<input name="category" maxLength={50} defaultValue={f?.category ?? "General"} list="faq-cats" className="input mt-1" /></label>
      <label className="label">Order<input name="sortOrder" type="number" inputMode="numeric" min={0} max={9999} defaultValue={f?.sortOrder ?? 100} className="input mt-1" /></label>
      <label className="flex min-h-11 items-center gap-2 self-end text-sm"><input type="checkbox" name="published" defaultChecked={f?.published ?? true} className="size-5" /> Published</label>
      <div className="sm:col-span-4"><SubmitButton>{f ? "Save changes" : "Add FAQ"}</SubmitButton></div>
    </ActionForm>
  );
}

function TestimonialForm({ t }: { t?: Tm }) {
  return (
    <ActionForm action={saveTestimonial} className="grid gap-3 sm:grid-cols-4" resetOnSuccess={!t}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <label className="label sm:col-span-2">Student name (e.g. “Priya S.”)<input name="name" required minLength={2} maxLength={80} defaultValue={t?.name} className="input mt-1" /></label>
      <label className="label">Suburb<input name="suburb" maxLength={60} defaultValue={t?.suburb} className="input mt-1" /></label>
      <label className="label">Stars
        <select name="rating" defaultValue={t?.rating ?? 5} className="input mt-1">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>
      </label>
      <label className="label sm:col-span-4">Review<textarea name="quote" rows={3} required minLength={5} maxLength={1000} defaultValue={t?.quote} className="input mt-1" /></label>
      <label className="flex items-start gap-2 py-2 text-sm sm:col-span-4"><input type="checkbox" name="published" defaultChecked={t?.published ?? false} className="mt-0.5 size-5 shrink-0" /> Published on the website (I confirm this is a genuine review from a real student, used with permission)</label>
      <div className="sm:col-span-4"><SubmitButton>{t ? "Save changes" : "Add testimonial"}</SubmitButton></div>
    </ActionForm>
  );
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireStaff(ADMINS);
  const sp = await searchParams;
  const tab = TABS.find(([k]) => k === sp.tab)?.[0] ?? "posts";

  return (
    <>
      <PageHeader title="Content" subtitle="Edit the learner tips, FAQs and reviews on the public website." />
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Content sections">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`/admin/content?tab=${k}`} aria-current={tab === k ? "page" : undefined} className="-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-sm font-semibold text-muted transition hover:text-ink aria-[current=page]:border-brand-700 aria-[current=page]:text-brand-700">
            {label}
          </Link>
        ))}
      </nav>
      {tab === "posts" && <Posts />}
      {tab === "faqs" && <Faqs />}
      {tab === "testimonials" && <Testimonials />}
    </>
  );
}

async function Posts() {
  const posts = await prisma.post.findMany({ orderBy: { publishedAt: "desc" } });
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Link href="/admin/content/posts/new" className="btn-primary btn-sm"><Plus className="size-4" aria-hidden /> New post</Link>
      </div>
      {posts.length === 0 ? (
        <EmptyState title="No posts yet" action={<Link href="/admin/content/posts/new" className="btn-outline btn-sm">Write the first one</Link>}>
          Learner tips help with Google rankings and answer common questions.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/content/posts/${p.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition hover:bg-surface active:bg-surface">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-brand-700">{p.title}</span>
                  <span className="block truncate text-xs text-muted">{p.category} · {fmtDate(p.publishedAt)} · /resources/{p.slug}</span>
                </span>
                <StatusBadge status={p.published ? "LIVE" : "DRAFT"} />
                <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Faqs() {
  const faqs = await prisma.faq.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const cats = [...new Set(faqs.map((f) => f.category))];
  return (
    <div className="space-y-2">
      <datalist id="faq-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
      {faqs.map((f) => (
        <details key={f.id} className="group card p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="badge mr-2 bg-surface text-muted">{f.category}</span>
              {f.question} {!f.published && <StatusBadge status="HIDDEN" className="ml-1" />}
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted transition group-open:rotate-90" aria-hidden />
          </summary>
          <div className="mt-3 border-t border-line pt-3">
            <FaqForm f={f} />
            <ActionForm action={deleteFaq} className="mt-4 border-t border-dashed border-line pt-3"><input type="hidden" name="id" value={f.id} /><SubmitButton className="btn-danger btn-sm" confirm="Delete this FAQ? This can't be undone.">Delete FAQ</SubmitButton></ActionForm>
          </div>
        </details>
      ))}
      <details className="card border-dashed p-4" open={!faqs.length || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand-700 [&::-webkit-details-marker]:hidden"><Plus className="size-4" aria-hidden /> Add FAQ</summary>
        <div className="mt-3"><FaqForm /></div>
      </details>
    </div>
  );
}

async function Testimonials() {
  const items = await prisma.testimonial.findMany({ orderBy: { createdAt: "desc" } });
  const samples = items.filter((t) => /^sample\b/i.test(t.name)).length;
  return (
    <div className="space-y-2">
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
        <strong>Only publish genuine reviews.</strong> The Australian Consumer Law prohibits fake or misleading testimonials. {samples > 0 && `${samples} sample testimonial(s) were added as examples — edit them with real student feedback (and remove “Sample”) or delete them.`} Ask happy students for permission before using their words.
      </p>
      {items.map((t) => (
        <details key={t.id} className="group card p-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              <span className="text-accent-600" aria-label={`${t.rating} stars`}>{"★".repeat(t.rating)}</span> {t.name}
              {t.suburb && <span className="font-normal text-muted"> · {t.suburb}</span>} <StatusBadge status={t.published ? "LIVE" : "HIDDEN"} className="ml-1" />
            </span>
            <ChevronRight className="size-5 shrink-0 text-muted transition group-open:rotate-90" aria-hidden />
          </summary>
          <div className="mt-3 border-t border-line pt-3">
            <TestimonialForm t={t} />
            <ActionForm action={deleteTestimonial} className="mt-4 border-t border-dashed border-line pt-3"><input type="hidden" name="id" value={t.id} /><SubmitButton className="btn-danger btn-sm" confirm="Delete this testimonial? This can't be undone.">Delete testimonial</SubmitButton></ActionForm>
          </div>
        </details>
      ))}
      <details className="card border-dashed p-4" open={!items.length || undefined}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold text-brand-700 [&::-webkit-details-marker]:hidden"><Plus className="size-4" aria-hidden /> Add testimonial</summary>
        <div className="mt-3"><TestimonialForm /></div>
      </details>
    </div>
  );
}
