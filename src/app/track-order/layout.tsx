import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Track Your Order | Gyantex Enterprise",
  robots: { index: false, follow: true },
};

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
