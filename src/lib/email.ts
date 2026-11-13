import "server-only";
import nodemailer from "nodemailer";
import { SITE } from "./site";
import { aud } from "./money";
import { fmtDate, fmtTime, durationLabel, todaySydney, addDays } from "./time";

/**
 * Free email: any SMTP account works. Easiest is a Gmail / Google Workspace account with an
 * App Password (500 emails/day free). Without SMTP settings, emails are logged to the console.
 */
const configured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
function tx() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

type Mail = { to: string; subject: string; html: string; text: string; ics?: string };

/** Sends an email. Returns true if it was handed to the mail server (or logged, when SMTP isn't set up). */
export async function sendEmail(m: Mail): Promise<boolean> {
  if (!m.to?.trim()) return true; // e.g. phone bookings without an email address — nothing to send
  if (!configured()) {
    console.info(`[email:dev] → ${m.to} | ${m.subject}\n${m.text}\n`);
    return true;
  }
  try {
    await tx().sendMail({
      from: process.env.EMAIL_FROM ?? `${SITE.name} <${process.env.SMTP_USER}>`,
      replyTo: process.env.OWNER_EMAIL,
      to: m.to,
      subject: m.subject,
      html: m.html,
      text: m.text,
      icalEvent: m.ics ? { method: "PUBLISH", content: m.ics } : undefined,
    });
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f2a43">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b4f7c;color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">${esc(SITE.name)}</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;background:#f4f7fb;font-size:12px;color:#55708a">Questions? Call or text ${SITE.phoneDisplay} · ${esc(SITE.url)}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#facc15;color:#0f2a43;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(label)}</a></p>`;

export type MailBooking = {
  ref: string;
  title: string;
  customerName: string;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date;
  durationMins: number;
  pickupAddress: string;
  pickupSuburb: string;
  priceCents: number;
  discountCents: number;
  paymentStatus: string;
  manageToken: string;
};

function details(b: MailBooking) {
  const due = b.priceCents - b.discountCents;
  const pay =
    b.paymentStatus === "CREDIT" ? "Package credit used" : b.paymentStatus === "PAID" ? "Paid — thank you" : `${aud(due)} (GST incl.) — pay on the day`;
  const rows: [string, string][] = [
    ["Lesson", `${b.title} (${durationLabel(b.durationMins)}, automatic)`],
    ["When", `${fmtDate(b.startsAt)}, ${fmtTime(b.startsAt)} – ${fmtTime(b.endsAt)}`],
    ["Pickup", `${b.pickupAddress}, ${b.pickupSuburb}`],
    ["Payment", pay],
    ["Booking ref", b.ref],
  ];
  return {
    html: `<table cellpadding="6" style="font-size:14px;border-collapse:collapse">${rows
      .map(([k, v]) => `<tr><td style="color:#55708a;vertical-align:top">${k}</td><td><strong>${esc(v)}</strong></td></tr>`)
      .join("")}</table>`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}

/** "today" / "tomorrow" / "on Wed 18 Nov", based on the Sydney calendar date. */
function dayWord(d: Date) {
  const day = todaySydney(d);
  if (day === todaySydney()) return "today";
  if (day === addDays(todaySydney(), 1)) return "tomorrow";
  return `on ${fmtDate(d)}`;
}

const manageUrl = (b: MailBooking) => `${SITE.url}/booking/${b.manageToken}`;

/** Escape text for .ics files (RFC 5545): backslash, comma, semicolon and line breaks. */
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");

/** Calendar file with one event per lesson session (split lessons have several). */
export function icsFor(input: MailBooking | MailBooking[]) {
  const parts = Array.isArray(input) ? input : [input];
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const stamp = f(new Date());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sagoon Driving School//Booking//EN",
    ...parts.flatMap((b) => [
      "BEGIN:VEVENT",
      `UID:${b.ref}@sagoondrivingschool`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${f(b.startsAt)}`,
      `DTEND:${f(b.endsAt)}`,
      `SUMMARY:Driving lesson — ${SITE.name}`,
      `LOCATION:${icsText(`${b.pickupAddress}, ${b.pickupSuburb} NSW`)}`,
      `DESCRIPTION:${icsText(`Booking ${b.ref}. Bring your learner licence. Manage: ${manageUrl(b)}`)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Plain list of sessions for split lessons. */
function sessionList(parts: MailBooking[]) {
  const rows = parts.map((b, i) => `Session ${i + 1}: ${fmtDate(b.startsAt)}, ${fmtTime(b.startsAt)} – ${fmtTime(b.endsAt)}`);
  return {
    html: `<ul style="font-size:14px;padding-left:18px">${parts
      .map((b, i) => `<li><strong>${esc(rows[i].replace(/^Session \d+: /, ""))}</strong> · <a href="${esc(manageUrl(b))}">manage</a></li>`)
      .join("")}</ul>`,
    text: rows.join("\n"),
  };
}

export const emails = {
  confirmation(input: MailBooking | MailBooking[], windowHours = 24) {
    const parts = Array.isArray(input) ? input : [input];
    const b = parts[0];
    const split = parts.length > 1;
    const d = details(b);
    const list = sessionList(parts);
    const total = parts.reduce((n, p) => n + p.priceCents - p.discountCents, 0);
    return {
      to: b.customerEmail,
      subject: split
        ? `Booked! Your lesson in ${parts.length} sessions from ${fmtDate(b.startsAt)} — ${SITE.name}`
        : `Booked! ${fmtDate(b.startsAt)} at ${fmtTime(b.startsAt)} — ${SITE.name}`,
      html: layout(
        `You're booked in, ${b.customerName.split(" ")[0]}!`,
        split
          ? `<p>Thanks for booking with us. Your lesson is split into ${parts.length} sessions:</p>${list.html}
<p style="font-size:14px">Pickup: <strong>${esc(`${b.pickupAddress}, ${b.pickupSuburb}`)}</strong><br>Total: <strong>${b.paymentStatus === "CREDIT" ? "package credit" : `${aud(total)} incl. GST — pay on the day`}</strong></p>
<p style="font-size:14px">Please bring your <strong>learner licence</strong> (or overseas licence) and wear comfortable, flat shoes.</p>
<p style="font-size:12px;color:#55708a">Each session can be rescheduled or cancelled on its own, free, up to ${windowHours} hours before it starts.</p>`
          : `<p>Thanks for booking with us. Here are your lesson details:</p>${d.html}
<p style="font-size:14px">Please bring your <strong>learner licence</strong> (or overseas licence) and wear comfortable, flat shoes. Your instructor will meet you at the pickup address.</p>
${button(manageUrl(b), "View, reschedule or cancel")}
<p style="font-size:12px;color:#55708a">Free cancellation or rescheduling up to ${windowHours} hours before your lesson.</p>`,
      ),
      text: split
        ? `You're booked in! Your lesson is split into ${parts.length} sessions:\n${list.text}\n\nManage: ${parts.map(manageUrl).join("\n")}`
        : `You're booked in!\n\n${d.text}\n\nManage your booking: ${manageUrl(b)}`,
      ics: icsFor(parts),
    };
  },
  ownerNewBooking(input: (MailBooking & { customerPhone: string }) | (MailBooking & { customerPhone: string })[], to: string) {
    const parts = Array.isArray(input) ? input : [input];
    const b = parts[0];
    const d = parts.length > 1 ? sessionList(parts) : details(b);
    return {
      to,
      subject: `New booking: ${b.customerName} — ${fmtDate(b.startsAt)} ${fmtTime(b.startsAt)}${parts.length > 1 ? ` (+${parts.length - 1} more)` : ""}`,
      html: layout("New booking", `${d.html}<p>Phone: <a href="tel:${esc(b.customerPhone)}">${esc(b.customerPhone)}</a></p>`),
      text: `New booking\n${d.text}\nPhone: ${b.customerPhone}`,
    };
  },
  reminder(b: MailBooking, hoursBefore: number) {
    const d = details(b);
    return {
      to: b.customerEmail,
      subject: `Reminder: driving lesson ${hoursBefore >= 24 ? dayWord(b.startsAt) : "soon"} at ${fmtTime(b.startsAt)}`,
      html: layout(
        hoursBefore >= 24 ? `See you ${dayWord(b.startsAt)}!` : "Your lesson starts soon",
        `${d.html}<p style="font-size:14px">Remember your licence, glasses if you need them, and flat shoes. Feeling nervous? That's completely normal — we'll take it at your pace.</p>${button(manageUrl(b), "Manage booking")}`,
      ),
      text: `Reminder\n${d.text}\nManage: ${manageUrl(b)}`,
      ics: undefined,
    };
  },
  cancelled(b: MailBooking, reason?: string | null) {
    return {
      to: b.customerEmail,
      subject: `Lesson cancelled — ${fmtDate(b.startsAt)} ${fmtTime(b.startsAt)}`,
      html: layout(
        "Your lesson has been cancelled",
        `<p>Your lesson on <strong>${fmtDate(b.startsAt)} at ${fmtTime(b.startsAt)}</strong> (ref ${b.ref}) has been cancelled.${reason ? ` Reason: ${esc(reason)}` : ""}</p>
<p>If you used a package credit, it has been returned to your account.</p>${button(`${SITE.url}/book`, "Book another time")}`,
      ),
      text: `Your lesson on ${fmtDate(b.startsAt)} at ${fmtTime(b.startsAt)} (ref ${b.ref}) has been cancelled.`,
    };
  },
  rescheduled(b: MailBooking, oldStart: Date) {
    const d = details(b);
    return {
      to: b.customerEmail,
      subject: `Lesson moved to ${fmtDate(b.startsAt)} at ${fmtTime(b.startsAt)}`,
      html: layout(
        "Your lesson has been rescheduled",
        `<p>Previously: ${fmtDate(oldStart)} at ${fmtTime(oldStart)}</p>${d.html}${button(manageUrl(b), "Manage booking")}`,
      ),
      text: `Your lesson has moved.\nPreviously: ${fmtDate(oldStart)} ${fmtTime(oldStart)}\n${d.text}`,
      ics: icsFor(b),
    };
  },
  reviewRequest(b: MailBooking, reviewUrl: string) {
    return {
      to: b.customerEmail,
      subject: `How was your lesson, ${b.customerName.split(" ")[0]}?`,
      html: layout(
        "Thanks for driving with us today!",
        `<p>We hope you felt more confident behind the wheel. If you have a minute, a quick review really helps other nervous learners find us.</p>${button(reviewUrl, "Leave a review")}${button(`${SITE.url}/book`, "Book your next lesson")}`,
      ),
      text: `Thanks for driving with us! Leave a review: ${reviewUrl}`,
    };
  },
  waitlistOpening(to: string, name: string, date: string) {
    return {
      to,
      subject: `A spot opened up on ${date}`,
      html: layout(
        `Good news, ${name.split(" ")[0]}!`,
        `<p>A lesson slot has opened on <strong>${esc(date)}</strong>. Slots go quickly — book now if it suits you.</p>${button(`${SITE.url}/book?date=${date}`, "See available times")}`,
      ),
      text: `A slot opened on ${date}: ${SITE.url}/book?date=${date}`,
    };
  },
  generic(to: string, subject: string, title: string, lines: string[], cta?: { href: string; label: string }) {
    return {
      to,
      subject,
      html: layout(title, lines.map((l) => `<p>${esc(l)}</p>`).join("") + (cta ? button(cta.href, cta.label) : "")),
      text: `${title}\n\n${lines.join("\n")}${cta ? `\n${cta.href}` : ""}`,
    };
  },
};

/** Owner diagnostics: log in to the mail server and send a real test email. Explains failures in plain English. */
export async function testEmailSetup(to: string): Promise<{ ok: boolean; message: string; detail?: string }> {
  const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].filter((k) => !process.env[k]);
  if (missing.length) {
    return { ok: false, message: `Email isn't set up, so no emails are being sent. Add ${missing.join(", ")} (and SMTP_PORT=465, EMAIL_FROM) in Vercel → Settings → Environment Variables, then redeploy.` };
  }
  if (!to) return { ok: false, message: "OWNER_EMAIL isn't set in Vercel, so there's nowhere to send the test (and you won't get new-booking emails)." };
  try {
    await tx().verify();
    await tx().sendMail({
      from: process.env.EMAIL_FROM ?? `${SITE.name} <${process.env.SMTP_USER}>`,
      to,
      subject: `✅ Test email from ${SITE.name}`,
      text: "Email sending works. Booking confirmations, reminders and new-booking notices will arrive like this.",
    });
    return { ok: true, message: `Test email sent to ${to}. Check your inbox (and Spam the first time).` };
  } catch (e) {
    const err = e as { code?: string; responseCode?: number; message?: string };
    const detail = `${err.code ?? ""} ${err.responseCode ?? ""} ${err.message ?? e}`.trim().slice(0, 300);
    let message = "The mail server refused the email.";
    if (err.code === "EAUTH" || err.responseCode === 535 || /auth|credentials|password/i.test(err.message ?? ""))
      message =
        "Gmail rejected the login. SMTP_USER must be your full Gmail address and SMTP_PASS a 16-letter App Password (from myaccount.google.com/apppasswords, typed without spaces), not your normal Gmail password. 2-Step Verification must be on.";
    else if (["ENOTFOUND", "ECONNECTION", "ETIMEDOUT", "ECONNREFUSED", "ESOCKET"].includes(err.code ?? ""))
      message = "Couldn't reach the mail server. For Gmail use SMTP_HOST=smtp.gmail.com and SMTP_PORT=465.";
    else if (/sender|from address|not owned/i.test(err.message ?? ""))
      message = "EMAIL_FROM must use the same address as SMTP_USER, e.g. Sagoon Driving School <you@gmail.com>.";
    return { ok: false, message, detail };
  }
}
