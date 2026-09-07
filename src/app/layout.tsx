import type { Metadata } from "next";
import {
  Inter,
  Poppins,
  Lato,
  Playfair_Display,
  Work_Sans,
  Space_Grotesk,
  Source_Sans_3,
  Libre_Baskerville,
} from "next/font/google";
import "./globals.css";
import ToastViewport from "@/components/ToastViewport";
import BrandingProvider from "@/components/BrandingProvider";
import {
  BUSINESS_NAME,
  BUSINESS_TAGLINE,
  INSTAGRAM_HANDLE,
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
} from "@/lib/config";

// Every curated font pairing (src/lib/branding.ts's BRAND_FONT_OPTIONS) is
// declared here so BrandingProvider can switch between them at runtime by
// pointing --font-sans/--font-serif at a different variable. Only the
// default pairing (Inter/Poppins) is preloaded — it's what every visitor
// sees unless the owner has changed Admin → Settings → Branding, so eagerly
// fetching the other 6 pairings' font files on every single page load was
// pure wasted bandwidth on the critical path. The rest still work exactly
// the same when actually selected — next/font self-hosts and inlines them
// with font-display: swap regardless of preload, it's just no longer an
// eager <link rel="preload"> for fonts almost nobody uses.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"], preload: false });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["500", "600", "700"], preload: false });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], weight: ["400", "500", "600"], preload: false });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600", "700"], preload: false });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "500", "600"], preload: false });
const libreBaskerville = Libre_Baskerville({ variable: "--font-libre-baskerville", subsets: ["latin"], weight: ["400", "700"], preload: false });

const FONT_VARIABLES = [inter, poppins, lato, playfairDisplay, workSans, spaceGrotesk, sourceSans, libreBaskerville]
  .map((font) => font.variable)
  .join(" ");

const SITE_URL = "https://gyantexenterpr1se.web.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Gyantex Enterprise | Custom Textile Design & Printing",
  description: "Design and print custom textile cloth for funerals, churches, schools, institutions, and events in Kumasi.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Gyantex Enterprise",
    description: "Custom textile design and printing for funerals, churches, schools, institutions, and events in Kumasi.",
    url: SITE_URL,
    siteName: "Gyantex Enterprise",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gyantex Enterprise",
    description: "Custom textile design and printing for funerals, churches, schools, institutions, and events in Kumasi.",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": `${SITE_URL}/#business`,
  name: BUSINESS_NAME,
  description: BUSINESS_TAGLINE,
  image: `${SITE_URL}/images/gyantex-business-profile.jpg`,
  url: SITE_URL,
  telephone: `+${WHATSAPP_NUMBER}`,
  email: SUPPORT_EMAIL,
  priceRange: "GHS",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Kejetia Gate 11, Shop No. F-1472",
    addressLocality: "Kumasi",
    addressCountry: "GH",
  },
  sameAs: [`https://www.instagram.com/${INSTAGRAM_HANDLE.replace(/^@/, "")}`],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${FONT_VARIABLES} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-charcoal bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <BrandingProvider />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
