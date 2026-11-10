"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send } from "lucide-react";
import { SITE } from "@/lib/site";
import { showsBookBar } from "./StickyBookBar";

/**
 * Free, no-API chatbot: answers common questions from a local knowledge base and hands off
 * to WhatsApp / phone for anything else. Edit the ANSWERS list to change replies.
 */
type Msg = { from: "bot" | "me"; text: string; link?: { href: string; label: string } };

const ANSWERS: { keys: string[]; text: string; link?: { href: string; label: string } }[] = [
  { keys: ["price", "cost", "how much", "rate", "fee", "$"], text: "Lessons start from $75 for 1 hour (GST incl.), and packages save you more. All lessons are in our automatic dual-control car.", link: { href: "/pricing", label: "See pricing" } },
  { keys: ["book", "available", "availability", "slot", "time", "appointment"], text: "You can see live availability and book in about 2 minutes — no account needed.", link: { href: "/book", label: "Book a lesson" } },
  { keys: ["cancel", "reschedule", "change", "move"], text: "Free cancellation or rescheduling up to 24 hours before your lesson using the link in your confirmation email.", link: { href: "/cancellation-policy", label: "Cancellation policy" } },
  { keys: ["test", "exam", "driving test"], text: "Our Driving Test package includes pickup, a warm-up lesson, use of our car for the test and drop-off.", link: { href: "/pricing", label: "Driving Test package" } },
  { keys: ["manual", "auto", "transmission", "gear"], text: "We teach automatic only — a modern dual-control car, so your instructor can always help brake." },
  { keys: ["area", "suburb", "pickup", "pick up", "where", "location"], text: "We pick up from home, school, work or the station across Rockdale and nearby St George suburbs, free." },
  { keys: ["log", "logbook", "hours", "3 for 1", "3x"], text: "In NSW, 1 hour with a licensed instructor counts as 3 logbook hours (up to 10 lesson hours = 30 logbook hours). Always check current rules with Service NSW.", link: { href: "/resources/logbook-hours-explained", label: "Logbook guide" } },
  { keys: ["overseas", "international", "foreign", "convert"], text: "Overseas licence holders usually need 1–3 refresher lessons on NSW rules and test standards.", link: { href: "/pricing", label: "Overseas refresher" } },
  { keys: ["nervous", "scared", "anxious", "afraid", "fear"], text: "You're in good hands — most of our students start nervous. We go at your pace, start in quiet streets and never shout.", link: { href: "/resources", label: "Tips for nerves" } },
  { keys: ["pay", "payment", "card", "cash", "payid"], text: "No online payment needed — pay at your lesson by card, cash or PayID, or by bank transfer." },
  { keys: ["gift", "voucher"], text: "Gift vouchers are available! Message us and we'll send a code the recipient can use when booking." },
  { keys: ["rain", "weather"], text: "Lessons go ahead in light rain (great practice!). If it's unsafe, we'll reschedule for free." },
];

function answer(q: string): Msg {
  const s = q.toLowerCase();
  const hit = ANSWERS.find((a) => a.keys.some((k) => s.includes(k)));
  if (hit) return { from: "bot", text: hit.text, link: hit.link };
  return { from: "bot", text: `Good question! For anything else, message us on WhatsApp or call ${SITE.phoneDisplay} — we usually reply within an hour.`, link: { href: `https://wa.me/${SITE.whatsapp}`, label: "Chat on WhatsApp" } };
}

export function ChatWidget() {
  const path = usePathname();
  const barVisible = showsBookBar(path);
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "bot", text: "Hi! 👋 Ask me about prices, booking, the driving test or anything else." }]);
  const [q, setQ] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [msgs]);

  // Focus the question box when the panel opens; Escape closes it and returns focus to the launcher.
  useEffect(() => {
    if (!open) return;
    // On touch screens, don't pop the keyboard up over the answers straight away.
    if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        launcherRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const send = (text: string) => {
    if (!text.trim()) return;
    setMsgs((m) => [...m, { from: "me", text }, answer(text)]);
    setQ("");
  };

  return (
    <div
      className={`no-print fixed right-3 z-40 flex flex-col items-end sm:right-5 sm:bottom-5 ${
        barVisible ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]" : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]"
      }`}
    >
      {open && (
        <div
          id="quick-questions"
          role="dialog"
          aria-labelledby="quick-questions-title"
          className="animate-pop-in mb-3 flex h-[min(28rem,calc(100dvh-11rem))] w-[min(22rem,calc(100vw-1.5rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 bg-brand-700 py-2 pr-2 pl-4 text-white">
            <div>
              <p id="quick-questions-title" className="font-bold">Quick questions</p>
              <p className="text-xs text-brand-100">Instant answers to common questions</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                launcherRef.current?.focus();
              }}
              aria-label="Close chat"
              className="grid size-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-white/15 focus-visible:outline-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-3" aria-live="polite">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={
                  m.from === "me"
                    ? "ml-8 rounded-2xl rounded-br-sm bg-brand-700 p-3 text-sm text-white"
                    : "mr-8 rounded-2xl rounded-bl-sm bg-surface p-3 text-sm"
                }
              >
                {m.text}
                {m.link && (
                  <Link
                    href={m.link.href}
                    className="mt-2 block link-underline"
                    onClick={() => setOpen(false)}
                    {...(m.link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {m.link.label} →
                  </Link>
                )}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-line px-3 pt-2.5" role="group" aria-label="Suggested questions">
            {["Prices", "Book", "Driving test", "Logbook hours"].map((s) => (
              <button key={s} type="button" className="chip min-h-8 px-3 py-1 text-xs" onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(q);
            }}
          >
            <label htmlFor="chat-q" className="sr-only">Your question</label>
            <input
              ref={inputRef}
              id="chat-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="input min-h-10 py-2 text-base sm:text-sm"
              placeholder="Type a question…"
              autoComplete="off"
              enterKeyHint="send"
            />
            <button className="btn-brand btn-sm size-10 shrink-0 px-0" aria-label="Send" disabled={!q.trim()}>
              <Send className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <a
          href={`https://wa.me/${SITE.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp (opens in a new tab)"
          className="grid size-12 place-items-center rounded-full bg-whatsapp text-white shadow-lg ring-1 ring-black/5 transition-[background-color,scale] duration-150 hover:scale-105 hover:bg-whatsapp-dark active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden><path d="M20.5 3.5A11.8 11.8 0 0 0 1.9 17.7L.5 23.5l5.9-1.5a11.8 11.8 0 0 0 5.6 1.4A11.8 11.8 0 0 0 20.5 3.5Zm-8.5 18a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.5.9.9-3.4-.2-.4a9.8 9.8 0 1 1 8.2 4.5Zm5.4-7.3c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.5 3.5 0 0 0-1.1 2.6 6 6 0 0 0 1.3 3.2 13.5 13.5 0 0 0 5.2 4.6c1.9.8 2.7.9 3.6.7a3.1 3.1 0 0 0 2-1.4 2.5 2.5 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z"/></svg>
        </a>
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="quick-questions"
          aria-label={open ? "Close quick questions" : "Open quick questions"}
          className="grid size-12 place-items-center rounded-full bg-brand-700 text-white shadow-lg ring-1 ring-black/5 transition-[background-color,scale] duration-150 hover:scale-105 hover:bg-brand-800 active:scale-95"
        >
          {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
