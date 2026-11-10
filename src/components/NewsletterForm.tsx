"use client";
import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/public";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, {});
  if (state.ok) return <p className="mt-3 text-sm font-semibold text-ok" role="status">{state.message}</p>;
  return (
    <form action={action} className="mt-3 space-y-2">
      <label htmlFor="nl-email" className="sr-only">Email address</label>
      <div className="flex gap-2">
        <input id="nl-email" name="email" type="email" required autoComplete="email" placeholder="you@email.com" className="input min-h-10 py-2 text-sm" />
        <button className="btn-brand btn-sm" disabled={pending}>Join</button>
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5" /> I agree to receive emails and accept the <a href="/privacy" className="underline">privacy policy</a>.
      </label>
      {state.error && <p className="text-xs text-danger" role="alert">{state.error}</p>}
    </form>
  );
}
