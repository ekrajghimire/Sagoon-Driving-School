import Link from "next/link";
import { Logo } from "./Logo";
import { SITE } from "@/lib/site";
import { NewsletterForm } from "./NewsletterForm";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-surface pb-24 sm:pb-0">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-3 text-sm text-muted">{SITE.tagline}.</p>
          <p className="mt-3 text-sm">
            <a className="font-semibold text-brand-700" href={`tel:${SITE.phoneTel}`}>
              {SITE.phoneDisplay}
            </a>
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Lessons</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/book">Book a lesson</Link></li>
            <li><Link href="/pricing">Pricing & packages</Link></li>
            <li><Link href="/pricing#estimator">How many lessons do I need?</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/account">My account</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Learn</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/resources">Learner tips & guides</Link></li>
            <li><Link href="/resources/nsw-licence-pathway-explained">NSW licence pathway</Link></li>
            <li><Link href="/about">About us</Link></li>
            <li><Link href="/reviews">Reviews</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Driving tips by email</h2>
          <p className="mt-3 text-sm text-muted">Monthly tips for learners. No spam, unsubscribe any time.</p>
          <NewsletterForm />
          <p className="mt-4 text-sm text-muted">{SITE.hoursText.join(" · ")}</p>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. Serving Rockdale & St George, Sydney NSW. All prices in AUD incl. GST.</p>
          <p className="flex flex-wrap gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cancellation-policy">Cancellation policy</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
