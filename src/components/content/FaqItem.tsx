import { ChevronDown } from "lucide-react";

/** Accessible native disclosure used for FAQs (home page preview and /faq). No client JS. */
export function FaqItem({ question, answer, compact = false }: { question: string; answer: string; compact?: boolean }) {
  return (
    <details className="group card overflow-hidden p-0 open:border-brand-200 open:shadow-md sm:p-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold transition-colors select-none hover:bg-surface group-open:rounded-b-none group-open:text-brand-800">
        <span>{question}</span>
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 transition-transform duration-200 group-open:rotate-180">
          <ChevronDown className="size-5" />
        </span>
      </summary>
      <p className={`px-5 pt-1 pb-5 whitespace-pre-line text-muted ${compact ? "text-sm" : ""}`}>{answer}</p>
    </details>
  );
}
