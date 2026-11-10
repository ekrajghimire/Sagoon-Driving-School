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

export function calendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY,
  );
}

let jwt: JWT | null = null;
function client() {
  if (!jwt) {
    jwt = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });
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

const calId = () => encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!);

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
