"use client";
import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { subscribeNewsletter, type FormState } from "@/app/actions/public";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, {});
  if (state.ok)
    return (
      <p className="mt-3 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm font-semibold text-ok" role="status">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  return (
    <form action={action} className="mt-3 space-y-2.5">
      <label htmlFor="nl-email" className="sr-only">Email address</label>
      <div className="flex gap-2">
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@email.com"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "nl-error" : undefined}
          className="input min-h-11 min-w-0 flex-1 py-2"
        />
        <button className="btn-brand shrink-0 px-4" disabled={pending}>{pending ? "Joining…" : "Join"}</button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-px" />
        <span>
          I agree to receive emails and accept the <Link href="/privacy" className="underline underline-offset-2 hover:text-brand-700">privacy policy</Link>.
        </span>
      </label>
      {state.error && <p id="nl-error" className="text-xs text-danger" role="alert">{state.error}</p>}
    </form>
  );
}
