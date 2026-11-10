"use client";
import Script from "next/script";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { showsBookBar } from "./StickyBookBar";

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
  const barVisible = showsBookBar(usePathname());
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
        // Mobile: full width, just above the sticky Call/Book bar. sm+: a compact card on the right, stacked
        // above the chat buttons, so it never sits over the left-aligned hero CTAs or hides the chat launcher.
        // z-[45]: above the chat (40) and sticky bar (30), below the header (50) so the open menu stays on top.
        <section
          aria-label="Cookie notice"
          className={`no-print animate-pop-in fixed inset-x-3 z-[45] rounded-2xl border border-line bg-white p-4 shadow-xl sm:left-auto sm:right-5 sm:bottom-[5.5rem] sm:w-full sm:max-w-sm ${
            barVisible ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
          }`}
        >
          <p className="text-sm leading-relaxed">
            We use essential cookies to make this site work, and — only with your OK — analytics cookies to improve it.{" "}
            <Link href="/privacy#cookies" className="link-underline">Learn more</Link>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="btn-outline btn-sm" onClick={() => save("essential")}>Essential only</button>
            <button type="button" className="btn-brand btn-sm" onClick={() => save("all")}>Accept all</button>
          </div>
        </section>
      )}
    </>
  );
}
