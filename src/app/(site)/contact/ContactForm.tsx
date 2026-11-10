"use client";
import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { sendContact, type FormState } from "@/app/actions/public";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, {});
  if (state.ok) {
    return (
      <p role="status" className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 font-semibold text-ok">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden /> {state.message}
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">Name</label>
          <input id="c-name" name="name" required minLength={2} autoComplete="name" className="input" />
        </div>
        <div>
          <label htmlFor="c-phone" className="label">Phone <span className="font-normal text-muted">(optional)</span></label>
          <input id="c-phone" name="phone" type="tel" autoComplete="tel" className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="c-email" className="label">Email</label>
        <input id="c-email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label htmlFor="c-msg" className="label">Message</label>
        <textarea id="c-msg" name="message" required minLength={5} rows={5} className="input min-h-32 resize-y" placeholder="e.g. I'm a nervous beginner and my test is in March — how many lessons would you suggest?" />
      </div>
      {/* Honeypot — hidden from people, bots fill it in */}
      <div className="hidden" aria-hidden>
        <label htmlFor="c-company">Company</label>
        <input id="c-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>I agree to my details being used to respond to my enquiry, as described in the <Link href="/privacy" className="link-underline">privacy policy</Link>.</span>
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
