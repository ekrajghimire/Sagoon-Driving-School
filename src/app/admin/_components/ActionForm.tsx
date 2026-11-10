"use client";
import { useActionState, useEffect, useRef } from "react";
import type { ActionState } from "../_lib/types";

/** <form> bound to a server action, with inline success / error feedback. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  hideSuccess = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hideSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state.error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && !hideSuccess && state.message && (
        <p role="status" className="mt-2 text-sm font-semibold text-ok">
          ✓ {state.message}
        </p>
      )}
    </form>
  );
}
