import StaticPageLayout from "@/components/StaticPageLayout";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import {
  BUSINESS_HOURS,
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_TAGLINE,
  FACEBOOK_PAGE,
  INSTAGRAM_HANDLE,
  LEGAL_ENTITY_NAME,
  PICKUP_ADDRESS,
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
} from "@/lib/config";

export const metadata = {
  title: "Contact | Gyantex Enterprise",
  description: "Contact Gyantex Enterprise for custom textile design and printing in Kumasi.",
};

export default function ContactPage() {
  const message = encodeURIComponent("Hi Gyantex Enterprise, I want to request a custom cloth quote.");

  return (
    <StaticPageLayout title="Contact Gyantex Enterprise">
      <p>{BUSINESS_TAGLINE} WhatsApp is the fastest way to send logos, portraits, references, quantities, and deadlines.</p>

      <div className="mt-6 grid gap-3">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 rounded-md border border-soft-grey bg-white p-5 transition-colors hover:border-olive/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/10 text-[#128C7E]">
            <MessageCircle size={20} />
          </div>
          <div>
            <div className="font-medium text-charcoal">WhatsApp</div>
            <div className="text-sm text-charcoal/60">{BUSINESS_PHONE_DISPLAY} for quote requests and design follow-up</div>
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-4 rounded-md border border-soft-grey bg-white p-5 transition-colors hover:border-olive/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-olive/10 text-olive">
            <Mail size={20} />
          </div>
          <div>
            <div className="font-medium text-charcoal">Email</div>
            <div className="text-sm text-charcoal/60">{SUPPORT_EMAIL}</div>
          </div>
        </a>

        <div className="flex items-center gap-4 rounded-md border border-soft-grey bg-white p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand/40 text-charcoal">
            <MapPin size={20} />
          </div>
          <div>
            <div className="font-medium text-charcoal">Pickup Location</div>
            <div className="text-sm text-charcoal/60">{PICKUP_ADDRESS}</div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm text-charcoal/60">
        Hours: {BUSINESS_HOURS}. Social: {INSTAGRAM_HANDLE} / {FACEBOOK_PAGE}.
      </p>
      <p className="mt-8 text-xs text-charcoal/40">{LEGAL_ENTITY_NAME} operates this website.</p>
    </StaticPageLayout>
  );
}
