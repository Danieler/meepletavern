import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/site";

export const preferredRegion = "fra1";

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800", "900"]
});

const displayFont = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["600", "700"]
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} - ${siteConfig.claim}`,
    template: `%s | ${siteConfig.name}`
  },
  description: siteConfig.subclaim,
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: `${siteConfig.name} - ${siteConfig.claim}`,
    description: siteConfig.subclaim,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: siteConfig.logoImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - ${siteConfig.claim}`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} - ${siteConfig.claim}`,
    description: siteConfig.subclaim,
    images: [siteConfig.logoImage]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logoImage}`,
    sameAs: [
      // Add social media profiles here if available
      // "https://www.facebook.com/your-profile",
      // "https://twitter.com/your-profile"
    ]
  };

  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
