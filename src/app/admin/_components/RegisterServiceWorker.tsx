"use client";
import { useEffect } from "react";

export const SW_URL = "/admin-sw.js";
export const SW_SCOPE = "/admin";

/** Registers the admin service worker (needed to install the app and receive alerts). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE, updateViaCache: "none" }).catch((e) => console.warn("[sw] register failed", e));
  }, []);
  return null;
}
