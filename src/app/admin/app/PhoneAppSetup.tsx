"use client";
import { useEffect, useState, useTransition } from "react";
import { BellRing, BellOff, Check, Download, Loader2, Share, Smartphone, SquarePlus } from "lucide-react";
import { SW_SCOPE, SW_URL } from "../_components/RegisterServiceWorker";
import { getPushKey, removePushSubscription, savePushSubscription, sendTestPush } from "../actions/push";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type Env = {
  supported: boolean;
  standalone: boolean;
  ios: boolean;
  android: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
};

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "Computer";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  return `${os} · ${standalone ? "installed app" : browser}`;
}

async function readEnv(): Promise<Env> {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  let subscribed = false;
  if (supported) {
    const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    subscribed = Boolean(await reg?.pushManager.getSubscription());
  }
  return {
    supported,
    ios,
    android: /Android/.test(ua),
    standalone: window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true,
    permission: "Notification" in window ? Notification.permission : "unsupported",
    subscribed,
  };
}

export function PhoneAppSetup() {
  const [env, setEnv] = useState<Env | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    readEnv().then((e) => alive && setEnv(e));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPrompt);
    };
    const onInstalled = () => readEnv().then((e) => alive && setEnv(e));
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function turnOn() {
    setMsg(null);
    // iPhone requires the permission prompt to come straight from the tap, before any other awaits.
    const permission = Notification.requestPermission();
    start(async () => {
      try {
        if ((await permission) !== "granted") {
          setMsg({ ok: false, text: "Alerts were blocked. See the note below to allow them, then try again." });
          setEnv(await readEnv());
          return;
        }
        const reg = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE, updateViaCache: "none" });
        await navigator.serviceWorker.ready;
        const key = urlBase64ToUint8Array(await getPushKey());
        let sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe(); // start fresh so it always matches the site's current key
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const saved = await savePushSubscription(sub.toJSON(), deviceName());
        if (!saved.ok) throw new Error(saved.error);
        const test = await sendTestPush();
        setMsg(test.ok ? { ok: true, text: "Alerts are on. You should see a test alert in a moment." } : { ok: false, text: test.error });
      } catch (e) {
        setMsg({ ok: false, text: `Couldn't turn on alerts: ${(e as Error).message}` });
      }
      setEnv(await readEnv());
    });
  }

  function turnOff() {
    setMsg(null);
    start(async () => {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setMsg({ ok: true, text: "Alerts are off on this device." });
      setEnv(await readEnv());
    });
  }

  function test() {
    setMsg(null);
    start(async () => {
      const r = await sendTestPush();
      setMsg(r.ok ? { ok: true, text: `Test alert sent to ${r.sent} device${r.sent === 1 ? "" : "s"}.` } : { ok: false, text: r.error });
    });
  }

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setEnv(await readEnv());
  }

  if (!env) {
    return (
      <div className="card flex items-center gap-2 text-muted">
        <Loader2 className="size-4 animate-spin" /> Checking this device…
      </div>
    );
  }

  const iosNeedsInstall = env.ios && !env.standalone;

  return (
    <div className="space-y-4">
      {/* Step 1: install */}
      <section className="card" aria-labelledby="step1">
        <div className="flex items-start gap-3">
          <StepDot done={env.standalone} n={1} />
          <div className="min-w-0 flex-1">
            <h2 id="step1" className="text-lg font-bold">Add Sagoon Admin to your home screen</h2>
            {env.standalone ? (
              <p className="mt-1 text-sm text-ok">✓ You&apos;re using the installed app on this device.</p>
            ) : installPrompt ? (
              <>
                <p className="mt-1 text-sm text-muted">It opens full-screen like a normal app, straight to today&apos;s lessons.</p>
                <button className="btn-brand mt-3" onClick={install}>
                  <Download className="size-4" /> Install app
                </button>
              </>
            ) : env.ios ? (
              <ol className="mt-2 space-y-2 text-sm">
                <li>1. Open this page in <strong>Safari</strong> (not Chrome or the Gmail/Messenger in-app browser).</li>
                <li className="flex flex-wrap items-center gap-1">
                  2. Tap the <strong>Share</strong> button <Share className="inline size-4" aria-label="Share icon" /> at the bottom of the screen.
                </li>
                <li className="flex flex-wrap items-center gap-1">
                  3. Scroll down and tap <strong>Add to Home Screen</strong> <SquarePlus className="inline size-4" aria-hidden />, then <strong>Add</strong>.
                </li>
                <li>4. Open <strong>Sagoon Admin</strong> from your home screen and come back to this page (More → Phone app &amp; alerts).</li>
              </ol>
            ) : env.android ? (
              <p className="mt-2 text-sm">
                In Chrome, tap the <strong>⋮</strong> menu (top right) → <strong>Add to Home screen</strong> or <strong>Install app</strong>.
              </p>
            ) : (
              <p className="mt-2 text-sm">
                On a computer, look for the install icon <Download className="inline size-4" aria-hidden /> in the address bar (Chrome / Edge), or just keep this page bookmarked. For alerts on the go, do this on your phone.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Step 2: alerts */}
      <section className="card" aria-labelledby="step2">
        <div className="flex items-start gap-3">
          <StepDot done={env.subscribed} n={2} />
          <div className="min-w-0 flex-1">
            <h2 id="step2" className="text-lg font-bold">Turn on new-booking alerts</h2>
            {iosNeedsInstall ? (
              <p className="mt-1 text-sm">
                On iPhone and iPad, alerts only work <strong>inside the installed app</strong> (iOS 16.4 or newer). Do step 1, open Sagoon Admin from your home screen, then turn alerts on there.
              </p>
            ) : !env.supported ? (
              <p className="mt-1 text-sm">This browser can&apos;t show alerts. Use Chrome on Android, or Safari on iPhone with the app installed.</p>
            ) : env.subscribed ? (
              <>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-ok">
                  <BellRing className="size-4" /> Alerts are on for this device.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-brand" onClick={test} disabled={pending}>
                    {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Send a test alert
                  </button>
                  <button className="btn-outline" onClick={turnOff} disabled={pending}>
                    <BellOff className="size-4" /> Turn off on this device
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Your phone will ping you the moment someone books online — even when the app is closed.</p>
                <button className="btn-primary mt-3" onClick={turnOn} disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Turn on alerts
                </button>
                {env.permission === "denied" && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
                    Alerts are blocked for this site.{" "}
                    {env.ios
                      ? "Open iPhone Settings → Notifications → Sagoon Admin → Allow Notifications."
                      : env.android
                        ? "In Chrome tap ⋮ → Settings → Site settings → Notifications, and allow this site (or long-press the app icon → App info → Notifications)."
                        : "Click the icon left of the web address → Site settings → Notifications → Allow."}{" "}
                    Then tap Turn on alerts again.
                  </p>
                )}
              </>
            )}
            {msg && (
              <p role="status" className={`mt-3 flex items-start gap-1.5 rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50 text-ok" : "bg-red-50 text-danger"}`}>
                {msg.ok && <Check className="mt-0.5 size-4 shrink-0" />} {msg.text}
              </p>
            )}
          </div>
        </div>
      </section>

      <p className="flex items-start gap-2 px-1 text-xs text-muted">
        <Smartphone className="mt-0.5 size-4 shrink-0" />
        Alerts are set up per device. Turn them on separately on each phone or computer you want pinged. Make sure Do Not Disturb / Focus isn&apos;t hiding them.
      </p>
    </div>
  );
}

function StepDot({ n, done }: { n: number; done: boolean }) {
  return (
    <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-ok text-white" : "bg-brand-50 text-brand-800"}`}>
      {done ? <Check className="size-4" /> : n}
    </span>
  );
}
