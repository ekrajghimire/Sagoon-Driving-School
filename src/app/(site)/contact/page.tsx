import type { Metadata } from "next";
import { Phone, MessageCircle, Clock, MapPin, Mail } from "lucide-react";
import { getSettings } from "@/lib/db";
import { SITE } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Contact Us",
  description: "Call, WhatsApp or message Sagoon Driving School in Rockdale. Automatic driving lessons across Rockdale and St George.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="container-x py-12 sm:py-16">
      <p className="eyebrow">Contact</p>
      <h1 className="h1 mt-2">Get in touch</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Questions about lessons, packages or your test? We&apos;re happy to help — we usually reply within a few hours.</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="card">
          <h2 className="mb-4 text-xl font-bold">Send a message</h2>
          <ContactForm />
        </div>

        <div className="space-y-4">
          <div className="card space-y-4">
            <a href={`tel:${SITE.phoneTel}`} className="flex items-center gap-3 font-semibold hover:text-brand-700">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50"><Phone className="size-5 text-brand-700" aria-hidden /></span>
              <span>Call or text<span className="block text-lg">{SITE.phoneDisplay}</span></span>
            </a>
            <a href={`https://wa.me/${settings.whatsappNumber || SITE.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-semibold hover:text-brand-700">
              <span className="grid size-10 place-items-center rounded-full bg-green-50"><MessageCircle className="size-5 text-[#128C7E]" aria-hidden /></span>
              <span>WhatsApp<span className="block text-sm font-normal text-muted">Message us any time</span></span>
            </a>
            <a href={`mailto:${settings.email}`} className="flex items-center gap-3 font-semibold hover:text-brand-700">
              <span className="grid size-10 place-items-center rounded-full bg-brand-50"><Mail className="size-5 text-brand-700" aria-hidden /></span>
              <span className="break-all">{settings.email}</span>
            </a>
          </div>
          <div className="card">
            <h2 className="flex items-center gap-2 font-bold"><Clock className="size-5 text-brand-600" aria-hidden /> Lesson hours</h2>
            <ul className="mt-2 space-y-1 text-sm">{SITE.hoursText.map((h) => <li key={h}>{h}</li>)}</ul>
            <p className="mt-2 text-xs text-muted">Closed on NSW public holidays.</p>
          </div>
          <div className="card">
            <h2 className="flex items-center gap-2 font-bold"><MapPin className="size-5 text-brand-600" aria-hidden /> Areas we cover</h2>
            <p className="mt-2 text-sm text-muted">{settings.suburbs.join(" · ")}</p>
          </div>
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-line">
        <iframe
          title="Map of Rockdale NSW, our service area"
          src="https://www.google.com/maps?q=Rockdale+NSW+2216&output=embed"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-80 w-full"
        />
      </div>
    </div>
  );
}
