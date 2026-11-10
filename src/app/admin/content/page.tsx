import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/lib/time";
import { ADMINS } from "../_lib/roles";
import { PageHeader } from "../_components/PageHeader";
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
      <label className="label sm:col-span-4">Question<input name="question" required defaultValue={f?.question} className="input mt-1" /></label>
      <label className="label sm:col-span-4">Answer<textarea name="answer" rows={3} required defaultValue={f?.answer} className="input mt-1" /></label>
      <label className="label sm:col-span-2">Category<input name="category" defaultValue={f?.category ?? "General"} list="faq-cats" className="input mt-1" /></label>
      <label className="label">Order<input name="sortOrder" type="number" min={0} defaultValue={f?.sortOrder ?? 100} className="input mt-1" /></label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="published" defaultChecked={f?.published ?? true} /> Published</label>
      <div className="sm:col-span-4"><SubmitButton>{f ? "Save" : "Add FAQ"}</SubmitButton></div>
    </ActionForm>
  );
}

function TestimonialForm({ t }: { t?: Tm }) {
  return (
    <ActionForm action={saveTestimonial} className="grid gap-3 sm:grid-cols-4" resetOnSuccess={!t}>
      {t && <input type="hidden" name="id" value={t.id} />}
      <label className="label sm:col-span-2">Student name (e.g. “Priya S.”)<input name="name" required defaultValue={t?.name} className="input mt-1" /></label>
      <label className="label">Suburb<input name="suburb" defaultValue={t?.suburb} className="input mt-1" /></label>
      <label className="label">Stars
        <select name="rating" defaultValue={t?.rating ?? 5} className="input mt-1">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select>
      </label>
      <label className="label sm:col-span-4">Review<textarea name="quote" rows={3} required defaultValue={t?.quote} className="input mt-1" /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="published" defaultChecked={t?.published ?? false} /> Published on the website (I confirm this is a genuine review from a real student, used with permission)</label>
      <div className="sm:col-span-4"><SubmitButton>{t ? "Save" : "Add testimonial"}</SubmitButton></div>
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
          <Link key={k} href={`/admin/content?tab=${k}`} aria-current={tab === k ? "page" : undefined} className="-mb-px shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted aria-[current=page]:border-brand-700 aria-[current=page]:text-brand-700">
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
      <div className="mb-3 flex justify-end"><Link href="/admin/content/posts/new" className="btn-primary btn-sm">+ New post</Link></div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="table-x min-w-[560px]">
          <thead className="bg-surface"><tr><th>Title</th><th>Category</th><th>Status</th><th>Published</th></tr></thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/admin/content/posts/${p.id}`} className="font-semibold text-brand-700 hover:underline">{p.title}</Link><br /><span className="text-xs text-muted">/resources/{p.slug}</span></td>
                <td>{p.category}</td>
                <td>{p.published ? <span className="badge bg-green-100 text-ok">Live</span> : <span className="badge bg-slate-100 text-slate-600">Draft</span>}</td>
                <td>{fmtDate(p.publishedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        <details key={f.id} className="card p-4">
          <summary className="cursor-pointer font-semibold">
            <span className="badge mr-2 bg-surface text-muted">{f.category}</span>{f.question} {!f.published && <span className="badge ml-1 bg-slate-100 text-slate-600">hidden</span>}
          </summary>
          <div className="mt-3 border-t border-line pt-3">
            <FaqForm f={f} />
            <ActionForm action={deleteFaq} className="mt-2"><input type="hidden" name="id" value={f.id} /><SubmitButton className="btn-danger btn-sm" confirm="Delete this FAQ?">Delete</SubmitButton></ActionForm>
          </div>
        </details>
      ))}
      <details className="card border-dashed p-4" open={!faqs.length}>
        <summary className="cursor-pointer font-bold text-brand-700">+ Add FAQ</summary>
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
        <details key={t.id} className="card p-4">
          <summary className="cursor-pointer font-semibold">
            {"★".repeat(t.rating)} {t.name} · {t.suburb} {t.published ? <span className="badge ml-1 bg-green-100 text-ok">Live</span> : <span className="badge ml-1 bg-slate-100 text-slate-600">Hidden</span>}
          </summary>
          <div className="mt-3 border-t border-line pt-3">
            <TestimonialForm t={t} />
            <ActionForm action={deleteTestimonial} className="mt-2"><input type="hidden" name="id" value={t.id} /><SubmitButton className="btn-danger btn-sm" confirm="Delete this testimonial?">Delete</SubmitButton></ActionForm>
          </div>
        </details>
      ))}
      <details className="card border-dashed p-4">
        <summary className="cursor-pointer font-bold text-brand-700">+ Add testimonial</summary>
        <div className="mt-3"><TestimonialForm /></div>
      </details>
    </div>
  );
}
