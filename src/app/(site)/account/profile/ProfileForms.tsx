"use client";
import { useActionState } from "react";
import { updateProfile, addAddress, deleteAccount } from "../actions";
import type { FormState } from "@/app/actions/public";

const Msg = ({ s }: { s: FormState }) =>
  s.error ? <p role="alert" className="text-sm text-danger">{s.error}</p> : s.ok ? <p role="status" className="text-sm font-semibold text-ok">{s.message}</p> : null;

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string; licenceNumber: string; licenceType: string; testDate: string; marketingOptIn: boolean } }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="name">Full name</label><input id="name" name="name" defaultValue={user.name} className="input" required /></div>
      <div><label className="label" htmlFor="email">Email</label><input id="email" value={user.email} className="input bg-surface" disabled /></div>
      <div><label className="label" htmlFor="phone">Mobile</label><input id="phone" name="phone" type="tel" defaultValue={user.phone} className="input" /></div>
      <div>
        <label className="label" htmlFor="licenceType">Licence type</label>
        <select id="licenceType" name="licenceType" defaultValue={user.licenceType} className="input">
          <option value="">Choose…</option>
          <option>Learner (L)</option>
          <option>Provisional P1</option>
          <option>Provisional P2</option>
          <option>Full NSW licence</option>
          <option>Overseas licence</option>
          <option>Interstate licence</option>
        </select>
      </div>
      <div><label className="label" htmlFor="licenceNumber">Licence number</label><input id="licenceNumber" name="licenceNumber" defaultValue={user.licenceNumber} className="input" autoComplete="off" /></div>
      <div><label className="label" htmlFor="testDate">Driving test date (if booked)</label><input id="testDate" name="testDate" type="date" defaultValue={user.testDate} className="input" /></div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="marketingOptIn" defaultChecked={user.marketingOptIn} /> Email me driving tips and offers</label>
      <div className="flex items-center gap-3 sm:col-span-2"><button className="btn-brand" disabled={pending}>Save</button><Msg s={state} /></div>
    </form>
  );
}

export function AddressForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addAddress, {});
  return (
    <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_2fr_1fr_auto]">
      <input name="label" aria-label="Label" placeholder="Label (e.g. Home)" className="input" required />
      <input name="address" aria-label="Street address" placeholder="Street address" className="input" required />
      <input name="suburb" aria-label="Suburb" placeholder="Suburb" className="input" required />
      <button className="btn-outline" disabled={pending}>Add</button>
      <div className="sm:col-span-4"><Msg s={state} /></div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="confirm">Type DELETE to confirm</label>
        <input id="confirm" name="confirm" className="input" autoComplete="off" />
      </div>
      <button className="btn-danger" disabled={pending}>Delete my account</button>
      <div className="w-full"><Msg s={state} /></div>
    </form>
  );
}
