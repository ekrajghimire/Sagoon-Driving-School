"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { SW_SCOPE } from "./RegisterServiceWorker";

const KEY = "sds-alerts-nudge-dismissed";

/** Small prompt on the Today page until alerts are on for this device. */
export function AlertsNudge() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (localStorage.getItem(KEY)) return;
      } catch {}
      if (!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager?.getSubscription();
      if (alive && !sub) setShow(true);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!show) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-3 sm:p-4">
      <BellRing className="size-6 shrink-0 text-brand-700" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        <strong>Get a ping on your phone for every new booking.</strong>{" "}
        <Link href="/admin/app" className="font-semibold text-brand-700 underline underline-offset-2">Set up the phone app</Link>
      </p>
      <button
        className="btn-ghost btn-sm"
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setShow(false);
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
