"use client";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { useActionFormStatus, submitKey } from "./ActionForm";

/**
 * Submit button with a spinner while the form is saving.
 * Inside an <ActionForm>, every button is disabled while pending but only the one that was pressed spins.
 * `confirm` asks before submitting (use it for destructive actions).
 */
export function SubmitButton({
  children,
  className = "btn-brand btn-sm",
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const ctx = useActionFormStatus();
  const { pending: nativePending } = useFormStatus();
  const pending = ctx ? ctx.pending : nativePending;
  const mine = ctx ? ctx.key === null || ctx.key === submitKey(name, value) : true;
  const spinning = pending && mine;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={`${className} active:translate-y-px`}
      disabled={pending}
      aria-busy={spinning}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {spinning && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
      {spinning && <span className="sr-only"> — saving</span>}
    </button>
  );
}
