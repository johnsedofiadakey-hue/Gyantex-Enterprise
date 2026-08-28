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

// Every curated font pairing (src/lib/branding.ts's BRAND_FONT_OPTIONS) is
// preloaded here so BrandingProvider can switch between them instantly at
// runtime by pointing --font-sans/--font-serif at a different variable —
// no network fetch or page reload needed when the admin changes it.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const lato = Lato({ variable: "--font-lato", subsets: ["latin"], weight: ["400", "700"] });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["500", "600", "700"] });
const workSans = Work_Sans({ variable: "--font-work-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const libreBaskerville = Libre_Baskerville({ variable: "--font-libre-baskerville", subsets: ["latin"], weight: ["400", "700"] });

const FONT_VARIABLES = [inter, poppins, lato, playfairDisplay, workSans, spaceGrotesk, sourceSans, libreBaskerville]
  .map((font) => font.variable)
  .join(" ");

export const metadata: Metadata = {
  metadataBase: new URL("https://gyantexenterpr1se.web.app"),
  title: "Gyantex Enterprise | Custom Textile Design & Printing",
  description: "Design and print custom textile cloth for funerals, churches, schools, institutions, and events in Kumasi.",
  openGraph: {
    title: "Gyantex Enterprise",
    description: "Custom textile design and printing for funerals, churches, schools, institutions, and events in Kumasi.",
    url: "https://gyantexenterpr1se.web.app",
    siteName: "Gyantex Enterprise",
    type: "website",
  },
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
        <BrandingProvider />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
