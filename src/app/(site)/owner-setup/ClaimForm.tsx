"use client";
import { useActionState } from "react";
import { claimOwner, type ClaimState } from "./actions";

export function ClaimForm() {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimOwner, {});
  return (
    <form action={action} className="mt-5 space-y-3">
      <div>
        <label htmlFor="code" className="label">Owner setup code</label>
        <input id="code" name="code" type="password" autoComplete="off" required className="input" />
        <p className="help">Use the value of <strong>CRON_SECRET</strong> from Vercel → Settings → Environment Variables.</p>
      </div>
      {state.error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-danger">{state.error}</p>}
      <button className="btn-brand w-full" disabled={pending}>{pending ? "Checking…" : "Unlock admin dashboard"}</button>
    </form>
  );
}
