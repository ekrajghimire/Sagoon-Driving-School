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
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <StickyBookBar />
      <ChatWidget />
      <CookieConsent />
    </>
  );
}
