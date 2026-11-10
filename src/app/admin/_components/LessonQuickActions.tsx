"use client";
import { Check, UserX, Undo2 } from "lucide-react";
import { setBookingStatus } from "../actions/bookings";
import { ActionForm } from "./ActionForm";
import { SubmitButton } from "./SubmitButton";

export function LessonQuickActions({ id, status }: { id: string; status: string }) {
  if (status === "CANCELLED") return null;
  return (
    <ActionForm action={setBookingStatus} className="flex flex-wrap gap-2">
      <input type="hidden" name="id" value={id} />
      {status !== "COMPLETED" && (
        <SubmitButton name="status" value="COMPLETED" className="btn-brand btn-sm flex-1 sm:flex-none">
          <Check className="size-4" aria-hidden /> Mark complete
        </SubmitButton>
      )}
      {status !== "NO_SHOW" && (
        <SubmitButton name="status" value="NO_SHOW" className="btn-outline btn-sm" confirm="Mark this lesson as a no-show?">
          <UserX className="size-4" aria-hidden /> No-show
        </SubmitButton>
      )}
      {status !== "CONFIRMED" && (
        <SubmitButton name="status" value="CONFIRMED" className="btn-ghost btn-sm" confirm="Undo and set this lesson back to confirmed?">
          <Undo2 className="size-4" aria-hidden /> Undo
        </SubmitButton>
      )}
    </ActionForm>
  );
}
