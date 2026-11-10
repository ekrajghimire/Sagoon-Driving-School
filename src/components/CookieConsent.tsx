"use client";
import Script from "next/script";
import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "sds-cookie-consent"; // "all" | "essential"
const EVT = "sds-consent-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVT, cb);
  };
}
function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Cookie notice + consent-gated analytics. Google Analytics 4 and Facebook Pixel only load
 * after the visitor clicks "Accept all" (Australian Privacy Act / good practice).
 */
export function CookieConsent() {
  // "unknown" during server render so the banner never flashes for people who already chose.
  const choice = useSyncExternalStore(subscribe, read, () => "unknown");
  const save = (v: string) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
    window.dispatchEvent(new Event(EVT));
  };
  const ga = process.env.NEXT_PUBLIC_GA_ID;
  const fb = process.env.NEXT_PUBLIC_FB_PIXEL_ID;

  return (
    <>
      {choice === "all" && ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {choice === "all" && fb && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fb}');fbq('track','PageView');`}
        </Script>
      )}
      {choice === null && (
        <div role="dialog" aria-label="Cookie notice" className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-xl sm:bottom-4">
          <p className="text-sm">
            We use essential cookies to make this site work, and — only with your OK — analytics cookies to improve it.{" "}
            <Link href="/privacy#cookies" className="font-semibold text-brand-700 underline">Learn more</Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button className="btn-outline btn-sm" onClick={() => save("essential")}>Essential only</button>
            <button className="btn-brand btn-sm" onClick={() => save("all")}>Accept all</button>
          </div>
        </div>
      )}
    </>
  );
}
