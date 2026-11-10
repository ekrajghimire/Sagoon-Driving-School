import Link from "next/link";
import { Phone, Clock } from "lucide-react";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";

const LINK = "rounded-sm text-ink/90 transition-colors hover:text-brand-700 hover:underline hover:underline-offset-4";

const LESSONS = [
  { href: "/book", label: "Book a lesson" },
  { href: "/pricing", label: "Pricing & packages" },
  { href: "/pricing#estimator", label: "How many lessons do I need?" },
  { href: "/faq", label: "FAQ" },
  { href: "/account", label: "My account" },
];
const LEARN = [
  { href: "/resources", label: "Learner tips & guides" },
  { href: "/resources/nsw-licence-pathway-explained", label: "NSW licence pathway" },
  { href: "/about", label: "About us" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

function LinkList({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h2 className="text-sm font-bold tracking-wider text-muted uppercase">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className={LINK}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="container-x grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
        <div>
          <Link href="/" aria-label={`${SITE.name} home`} className="inline-block rounded-lg">
            <Logo />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-muted">{SITE.tagline}.</p>
          <a className="mt-4 inline-flex items-center gap-2 rounded-lg font-semibold text-brand-700 transition-colors hover:text-brand-800 hover:underline hover:underline-offset-4" href={`tel:${SITE.phoneTel}`}>
            <Phone className="size-4" aria-hidden /> {SITE.phoneDisplay}
          </a>
          <ul className="mt-3 space-y-0.5 text-sm text-muted">
            {SITE.hoursText.map((h, i) => (
              <li key={h} className="flex items-start gap-2">
                <Clock className={`mt-0.5 size-4 shrink-0 ${i ? "invisible" : ""}`} aria-hidden /> {h}
              </li>
            ))}
          </ul>
        </div>
        <LinkList title="Lessons" links={LESSONS} />
        <LinkList title="Learn" links={LEARN} />
        <div>
          <h2 className="text-sm font-bold tracking-wider text-muted uppercase">Driving tips by email</h2>
          <p className="mt-3 text-sm text-muted">Monthly tips for learners. No spam, unsubscribe any time.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-3 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. Serving Rockdale & St George, Sydney NSW. All prices in AUD incl. GST.</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link href="/privacy" className={LINK}>Privacy</Link></li>
            <li><Link href="/terms" className={LINK}>Terms</Link></li>
            <li><Link href="/cancellation-policy" className={LINK}>Cancellation policy</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
