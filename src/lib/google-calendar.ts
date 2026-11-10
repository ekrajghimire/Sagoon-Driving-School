import "server-only";
import { JWT } from "google-auth-library";
import { TZ } from "./time";
import { SITE } from "./site";
import type { BusyInterval } from "./availability";
import { sydneyDayRange } from "./time";

/**
 * Google Calendar sync (free — Google Calendar API has no cost at this volume).
 *
 * Uses a Google Cloud *service account* that the owner shares their calendar with
 * ("Make changes to events"). Two-way behaviour:
 *  1. Every booking is written to the calendar as an event (created / moved / deleted).
 *  2. Any other busy event the owner puts in the calendar (personal appointments, days off)
 *     blocks those times on the website, so the public booking page never offers them.
 */

const BASE = "https://www.googleapis.com/calendar/v3";

const unquote = (s: string) => s.trim().replace(/,$/, "").replace(/^["']|["']$/g, "").trim();

/**
 * Reads the service-account credentials, forgiving the usual copy-paste variations:
 * the key with literal "\n" or real line breaks, wrapped in quotes, or the whole JSON key
 * file pasted into GOOGLE_PRIVATE_KEY (or GOOGLE_SERVICE_ACCOUNT_JSON).
 */
function credentials() {
  let key = process.env.GOOGLE_PRIVATE_KEY ?? "";
  let email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || (key.trim().startsWith("{") ? key : "");
  if (json) {
    try {
      const j = JSON.parse(json) as { private_key?: string; client_email?: string };
      key = j.private_key ?? key;
      email = email || j.client_email || "";
    } catch {
      /* fall through with what we have */
    }
  }
  key = unquote(key).replace(/\\n/g, "\n");
  return { key, email: unquote(email), calendarId: unquote(process.env.GOOGLE_CALENDAR_ID ?? "") };
}

export function calendarConfigured() {
  const c = credentials();
  return Boolean(c.calendarId && c.email && c.key);
}

let jwt: JWT | null = null;
function client() {
  if (!jwt) {
    const c = credentials();
    jwt = new JWT({ email: c.email, key: c.key, scopes: ["https://www.googleapis.com/auth/calendar"] });
  }
  return jwt;
}

async function gcal<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { token } = await client().getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 204 || res.status === 410) return undefined as T; // deleted / already gone
  if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

const calId = () => encodeURIComponent(credentials().calendarId);

type GEvent = {
  id: string;
  status?: string;
  transparency?: "opaque" | "transparent";
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/**
 * Busy intervals from Google between two instants, *excluding* events this website created
 * (those are already represented by bookings in the database).
 */
export async function getGoogleBusy(timeMin: Date, timeMax: Date): Promise<BusyInterval[]> {
  if (!calendarConfigured()) return [];
  const busy: BusyInterval[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      maxResults: "250",
      timeZone: TZ,
    });
    if (pageToken) q.set("pageToken", pageToken);
    const data = await gcal<{ items: GEvent[]; nextPageToken?: string }>(`/calendars/${calId()}/events?${q}`);
    for (const e of data.items ?? []) {
      if (e.status === "cancelled" || e.transparency === "transparent") continue;
      if (e.extendedProperties?.private?.sdsBookingId) continue;
      if (e.start.dateTime && e.end.dateTime) {
        busy.push({ start: new Date(e.start.dateTime), end: new Date(e.end.dateTime), source: "google" });
      } else if (e.start.date && e.end.date) {
        // All-day event marked "Busy" → block whole Sydney days.
        busy.push({ start: sydneyDayRange(e.start.date).start, end: sydneyDayRange(e.end.date).start, source: "google" });
      }
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return busy;
}

export type CalendarBooking = {
  id: string;
  ref: string;
  title: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  pickupAddress: string;
  pickupSuburb: string;
  customerNotes: string | null;
  startsAt: Date;
  endsAt: Date;
  paymentStatus: string;
};

function eventBody(b: CalendarBooking) {
  const site = SITE.url;
  return {
    summary: `🚗 ${b.customerName} — ${b.title}`,
    location: `${b.pickupAddress}, ${b.pickupSuburb} NSW`,
    description: [
      `Booking ${b.ref}`,
      `Phone: ${b.customerPhone}`,
      `Email: ${b.customerEmail}`,
      `Payment: ${b.paymentStatus}`,
      b.customerNotes ? `Notes: ${b.customerNotes}` : "",
      `Manage: ${site}/admin/bookings/${b.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: b.startsAt.toISOString(), timeZone: TZ },
    end: { dateTime: b.endsAt.toISOString(), timeZone: TZ },
    colorId: "9",
    extendedProperties: { private: { sdsBookingId: b.id } },
    reminders: { useDefault: true },
  };
}

export async function createCalendarEvent(b: CalendarBooking) {
  const e = await gcal<GEvent>(`/calendars/${calId()}/events`, { method: "POST", body: JSON.stringify(eventBody(b)) });
  return e.id;
}

export async function updateCalendarEvent(eventId: string, b: CalendarBooking) {
  await gcal(`/calendars/${calId()}/events/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    body: JSON.stringify(eventBody(b)),
  });
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    await gcal(`/calendars/${calId()}/events/${encodeURIComponent(eventId)}`, { method: "DELETE" });
  } catch (e) {
    if (!String(e).includes(" 404")) throw e;
  }
}

/** Owner diagnostics: try reading the calendar and explain any failure in plain English. */
export async function checkCalendarConnection(): Promise<{ ok: boolean; message: string; detail?: string }> {
  const c = credentials();
  const missing = [!c.calendarId && "GOOGLE_CALENDAR_ID", !c.email && "GOOGLE_SERVICE_ACCOUNT_EMAIL", !c.key && "GOOGLE_PRIVATE_KEY"].filter(Boolean);
  if (missing.length) return { ok: false, message: `Missing on Vercel: ${missing.join(", ")}. Add them, then redeploy.` };
  if (!c.key.includes("BEGIN PRIVATE KEY") || !c.key.includes("END PRIVATE KEY")) {
    return { ok: false, message: "GOOGLE_PRIVATE_KEY doesn't look like a private key. Paste the whole private_key value from the JSON file, from -----BEGIN PRIVATE KEY----- to -----END PRIVATE KEY-----\\n." };
  }
  try {
    const now = new Date();
    await getGoogleBusy(now, new Date(now.getTime() + 7 * 86_400_000));
    return { ok: true, message: `Connected — reading calendar ${c.calendarId} as ${c.email}.` };
  } catch (e) {
    const detail = String((e as Error)?.message ?? e).slice(0, 400);
    const d = detail.toLowerCase();
    let message = "Google Calendar returned an error.";
    if (d.includes("decoder") || d.includes("pem") || d.includes("asn1") || d.includes("invalid jwt signature") || d.includes("no key or keyfile"))
      message = "The private key is in the wrong format or doesn't match the service account. Re-copy private_key from the same JSON file as client_email.";
    else if (d.includes("invalid_grant") || d.includes("account not found") || d.includes("invalid_client"))
      message = "Google doesn't recognise the service account. Check GOOGLE_SERVICE_ACCOUNT_EMAIL is the client_email from the JSON file, and that the key hasn't been deleted in Google Cloud.";
    else if (d.includes("accessnotconfigured") || d.includes("has not been used") || d.includes("is disabled"))
      message = "The Google Calendar API isn't enabled. In Google Cloud Console → APIs & Services → Library, enable “Google Calendar API” for this project, wait 2 minutes, then retry.";
    else if (d.includes(" 404") || d.includes("not found"))
      message = `Calendar “${c.calendarId}” not found for this service account. In Google Calendar → Settings → your calendar → Share with specific people, add ${c.email} with “Make changes to events”, and check GOOGLE_CALENDAR_ID is that calendar's ID.`;
    else if (d.includes(" 403") || d.includes("forbidden") || d.includes("insufficient"))
      message = `No permission on the calendar. Share it with ${c.email} and choose “Make changes to events”.`;
    return { ok: false, message, detail };
  }
}
