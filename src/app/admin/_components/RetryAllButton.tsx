"use client";
import { retryAllFailedSyncs } from "../actions/bookings";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function RetryAllButton() {
  return (
    <ActionForm action={retryAllFailedSyncs}>
      <SubmitButton className="btn-outline btn-sm">Retry all syncs</SubmitButton>
    </ActionForm>
  );
}
