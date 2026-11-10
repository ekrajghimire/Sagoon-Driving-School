import { AlertTriangle } from "lucide-react";

export const LEGAL_UPDATED = "10 November 2026";

export function LegalPage({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="h1 mt-2">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {LEGAL_UPDATED}</p>
      <div role="note" className="mt-6 flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
        <AlertTriangle className="size-5 shrink-0 text-amber-700" aria-hidden />
        <p><strong>Template — have this reviewed by a qualified Australian lawyer before launch.</strong> It is a starting point written for a small NSW driving school and may not suit your exact circumstances.</p>
      </div>
      {intro && <p className="mt-6 text-lg text-muted">{intro}</p>}
      <div className="prose-x mt-6">{children}</div>
    </div>
  );
}
