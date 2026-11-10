import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { StickyBookBar } from "@/components/StickyBookBar";
import { ChatWidget } from "@/components/ChatWidget";
import { CookieConsent } from "@/components/CookieConsent";
import { BusinessJsonLd } from "@/components/JsonLd";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessJsonLd />
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 focus-visible:outline-none">
        {children}
      </main>
      <Footer />
      <StickyBookBar />
      <ChatWidget />
      <CookieConsent />
    </>
  );
}
