import type { Metadata } from "next";
import Navbar from "@/components/common/Navbar";
import Reveal from "@/components/common/Reveal";
import ScrollFade from "@/components/common/ScrollFade";
import Footer from "@/components/common/Footer";
import SmoothScroll from "@/components/common/SmoothScroll";
import ClickSounds from "@/components/common/ClickSounds";
import { Analytics } from "@vercel/analytics/next";
import JsonLd from "@/components/common/JsonLd";
import { SITE } from "@/lib/site";
import "./globals.css";
import { jakartaSans, anton, jetbrainsMono } from "@/lib/fonts";
import "claudesprites/styles.css";
import "lenis/dist/lenis.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  keywords: [...SITE.keywords],
  alternates: {
    types: { "application/rss+xml": [{ url: "/writings/rss.xml", title: `${SITE.name}'s blog` }] },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    url: "/",
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    creator: SITE.x.handle,
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE.url}/#person`,
      name: SITE.name,
      alternateName: SITE.x.handle.slice(1),
      url: SITE.url,
      image: `${SITE.url}/app/pfp.jpg`,
      jobTitle: "Creative developer",
      description: SITE.description,
      address: { "@type": "PostalAddress", addressCountry: "IN" },
      sameAs: [SITE.x.url, SITE.github],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE.url}/#website`,
      url: SITE.url,
      name: SITE.name,
      description: SITE.description,
      inLanguage: "en",
      author: { "@id": `${SITE.url}/#person` },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${anton.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-dvh max-w-2xl w-full mx-auto flex flex-col px-4 py-8 sm:px-6 sm:py-16">
        <JsonLd data={personJsonLd} />
        <SmoothScroll>
          <Reveal>
            <Navbar />
          </Reveal>
          {children}
          <Footer />
          <ScrollFade />
          <ClickSounds />
        </SmoothScroll>
        <Analytics />
      </body>
    </html>
  );
}
