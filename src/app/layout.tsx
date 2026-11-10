import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | Automatic Driving Lessons in Rockdale, Sydney`,
    template: `%s | ${SITE.name}`,
  },
  description:
    "Patient, friendly automatic driving lessons in Rockdale and St George, Sydney. Book online in minutes, pickup included, driving test packages and logbook-eligible lessons.",
  keywords: ["driving school Rockdale", "driving lessons Rockdale", "automatic driving lessons Sydney", "driving instructor St George", "nervous driver lessons"],
  openGraph: { type: "website", locale: "en_AU", siteName: SITE.name, url: SITE.url },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = { themeColor: "#0b4f7c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={`${jakarta.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
