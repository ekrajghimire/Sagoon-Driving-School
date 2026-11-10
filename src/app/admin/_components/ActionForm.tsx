"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "../_lib/types";

type FormStatus = { pending: boolean; key: string | null };
const ActionFormStatus = createContext<FormStatus | null>(null);

/** Pending state of the surrounding <ActionForm> and which submit button (name=value) triggered it. */
export const useActionFormStatus = () => useContext(ActionFormStatus);
export const submitKey = (name?: string | null, value?: string | null) => `${name ?? ""}=${value ?? ""}`;

/**
 * <form> bound to a server action, with inline success / error feedback.
 *
 * Submits via onSubmit + startTransition instead of the `action` prop so React does NOT auto-reset
 * the form afterwards — otherwise everything the user typed is lost when the server returns an error.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  hideSuccess = false,
  onSuccess,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hideSuccess?: boolean;
  /** Called once after each successful submit. */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [key, setKey] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<ActionState | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (!state.ok) return;
    if (resetOnSuccess) ref.current?.reset();
    onSuccessRef.current?.();
    // Success messages fade after a few seconds; errors stay until the next submit.
    const t = setTimeout(() => setDismissed(state), 5000);
    return () => clearTimeout(t);
  }, [state, resetOnSuccess]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    setKey(submitter ? submitKey(submitter.getAttribute("name"), submitter.getAttribute("value")) : null);
    startTransition(() => formAction(fd));
  }

  const showSuccess = state.ok && !hideSuccess && state.message && dismissed !== state;
  return (
    <ActionFormStatus.Provider value={{ pending, key }}>
      <form ref={ref} onSubmit={onSubmit} className={className} aria-busy={pending}>
        {children}
        {state.error && !pending && (
          <p role="alert" className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-danger basis-full col-span-full">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{state.error}</span>
          </p>
        )}
        {showSuccess && !pending && (
          <p role="status" className="mt-2 flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-ok basis-full col-span-full">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{state.message}</span>
          </p>
        )}
      </form>
    </ActionFormStatus.Provider>
  );
}
