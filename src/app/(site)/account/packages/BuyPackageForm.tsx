"use client";
import { useActionState } from "react";
import { buyPackage } from "../actions";
import type { FormState } from "@/app/actions/public";

export function BuyPackageForm({ slug, name, price }: { slug: string; name: string; price: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(buyPackage, {});
  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <div>
        <label htmlFor="promo" className="label">Promo or voucher code (optional)</label>
        <input id="promo" name="promo" className="input max-w-xs uppercase placeholder:normal-case" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{state.error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={pending}>{pending ? "Adding…" : `Add ${name} — ${price}`}</button>
      <p className="text-xs text-muted">Credits are added straight away. Pay at your first lesson or by bank transfer — no card needed online.</p>
    </form>
  );
}
