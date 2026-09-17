import type { Metadata } from "next";
import {
  Inter,
  Montserrat,
  Noto_Sans,
  Noto_Serif,
  Onest,
  Source_Sans_3,
  Libre_Baskerville,
} from "next/font/google";
import "./globals.css";
import ToastViewport from "@/components/ToastViewport";
import BrandingProvider from "@/components/BrandingProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getBrandingStyle, type BrandSettings } from "@/lib/branding";
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
// default pairing (Inter/Montserrat) is preloaded — it's what every visitor
// sees unless the owner has changed Admin → Settings → Branding. The rest
// still work when selected — next/font self-hosts them with
// font-display: swap either way.
//
// Twi: product names and descriptions use Ɛ ɛ Ɔ ɔ. Those live in the
// `latin-ext` subset, so every font loads it, and every font in this list
// was checked to actually contain those letters. Poppins, Lato, Playfair
// Display, Work Sans and Space Grotesk do not, and were replaced — they
// rendered Twi letters in a mismatched fallback font. (next/font requires
// these options as inline literals, hence the repetition.)
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], preload: false });
const notoSerif = Noto_Serif({ variable: "--font-noto-serif", subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], preload: false });
const onest = Onest({ variable: "--font-onest", subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"], preload: false });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600"], preload: false });
const libreBaskerville = Libre_Baskerville({ variable: "--font-libre-baskerville", subsets: ["latin", "latin-ext"], weight: ["400", "700"], preload: false });

const FONT_VARIABLES = [inter, montserrat, notoSans, notoSerif, onest, sourceSans, libreBaskerville]
  .map((font) => font.variable)
  .join(" ");

const SITE_URL = "https://gyantex.com";

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

/** The owner's saved branding, read server-side so the first paint already
 * uses it. Any failure falls back to the built-in defaults in globals.css —
 * BrandingProvider still re-applies the latest values in the browser. */
async function getBrandSettings(): Promise<BrandSettings> {
  try {
    const snap = await getDoc(doc(db, "settings", "branding"));
    return snap.exists() ? (snap.data() as BrandSettings) : {};
  } catch (error) {
    console.error("Failed to load branding for first paint, using defaults", error);
    return {};
  }
}

// Runs before first paint: marks admin pages so the storefront's text-size
// settings never apply there (see html[data-admin] in globals.css).
const ADMIN_MARKER_SCRIPT = `if(location.pathname.indexOf("/admin")===0)document.documentElement.setAttribute("data-admin","")`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brandSettings = await getBrandSettings();

  return (
    <html
      lang="en"
      className={`${FONT_VARIABLES} h-full antialiased`}
      style={getBrandingStyle(brandSettings) as React.CSSProperties}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ADMIN_MARKER_SCRIPT }} />
      </head>
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
