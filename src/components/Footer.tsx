import Link from "next/link";
import { AtSign, Mail, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_TAGLINE,
  FACEBOOK_PAGE,
  INSTAGRAM_HANDLE,
  LEGAL_ENTITY_NAME,
  PAYMENT_METHODS,
  PICKUP_ADDRESS,
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
} from "@/lib/config";

const COLUMNS = [
  {
    title: "Catalog",
    links: [
      { label: "Start a Quote", href: "/#catalog" },
      { label: "Track Request", href: "/track-order" },
      { label: "Your Request", href: "/cart" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Returns & Refunds", href: "/returns" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <BrandMark tone="dark" href="/" />
          <p className="text-sm text-white/60 max-w-xs mb-4">
            {BUSINESS_TAGLINE}
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <MessageCircle size={15} /> WhatsApp {BUSINESS_PHONE_DISPLAY}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
              <Mail size={15} /> {SUPPORT_EMAIL}
            </a>
            <div className="flex items-start gap-2 text-white/70">
              <MapPin size={15} className="mt-0.5 shrink-0" /> {PICKUP_ADDRESS}
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <AtSign size={15} /> {INSTAGRAM_HANDLE} / {FACEBOOK_PAGE}
            </div>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 px-4 md:px-6 py-5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <ShieldCheck size={14} className="text-olive shrink-0" />
          <span>Secure online payments available via Paystack - {PAYMENT_METHODS.join(" · ")}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/40 text-center">
          <span>© {new Date().getFullYear()} {LEGAL_ENTITY_NAME}. All rights reserved.</span>
          <span className="text-white/20">·</span>
          <Link href="/admin/login" className="text-white/40 hover:text-white/70 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
