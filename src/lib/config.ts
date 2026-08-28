// Digits only, with country code, e.g. "233246860173" for a Ghana number.
// Set NEXT_PUBLIC_WHATSAPP_NUMBER in .env.local — see .env.example.
const FALLBACK_WHATSAPP_NUMBER = "233246860173";

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || FALLBACK_WHATSAPP_NUMBER;

export const PLACEHOLDER_IMAGE = "/placeholder.svg";

export const BUSINESS_NAME = "Gyantex Enterprise";
export const LEGAL_ENTITY_NAME = "Gyantex Enterprise";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@gyantexenterprise.com";
export const PICKUP_ADDRESS = "Kumasi inside Kejetia Gate 11, Shop No. F-1472";
export const BUSINESS_PHONE_DISPLAY = "+233 24 686 0173";
export const BUSINESS_TAGLINE = "We design and print textile cloth for funerals, churches, schools, and institutions.";
export const BUSINESS_HOURS = "By appointment only";
export const INSTAGRAM_HANDLE = "@gyantexenterprise_1";
export const FACEBOOK_PAGE = "Krossfa Textiles";

// What Paystack actually clears for Ghanaian merchants — kept accurate to
// what's really supported, since this list is a trust signal at checkout.
export const PAYMENT_METHODS = ["MTN MoMo", "Telecel Cash", "AirtelTigo Money", "Visa / Mastercard"];

export const DELIVERY_OPTIONS = [
  { id: "pickup", label: "Pickup at Kejetia", fee: 0, description: PICKUP_ADDRESS },
  { id: "kumasi_delivery", label: "Kumasi delivery", fee: 30, description: "Delivery fee is confirmed with your location." },
  { id: "ghana_delivery", label: "Delivery outside Kumasi", fee: 50, description: "Nationwide delivery is arranged after order confirmation." },
] as const;
