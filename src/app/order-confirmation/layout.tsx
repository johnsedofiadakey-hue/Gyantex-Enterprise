import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Confirmed | Gyantex Enterprise",
  robots: { index: false, follow: true },
};

export default function OrderConfirmationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
