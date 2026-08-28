import Link from "next/link";
import { BUSINESS_NAME } from "@/lib/config";

interface BrandMarkProps {
  href?: string;
  tone?: "light" | "dark";
  compact?: boolean;
  admin?: boolean;
  className?: string;
}

export default function BrandMark({
  href = "/",
  tone = "light",
  compact = false,
  admin = false,
  className = "",
}: BrandMarkProps) {
  const content = (
    <span className={`flex flex-col leading-none ${className}`}>
      <span
        className={`font-serif font-bold tracking-tight ${
          compact ? "text-xl" : "text-2xl"
        } ${tone === "dark" ? "text-sand" : "text-olive"}`}
      >
        GYANTEX
      </span>
      <span
        className={`mt-1 text-[10px] uppercase tracking-[0.28em] ${
          tone === "dark" ? "text-white/60" : "text-charcoal/70"
        }`}
      >
        Enterprise{admin ? " Admin" : ""}
      </span>
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label={`${BUSINESS_NAME} home`}>
      {content}
    </Link>
  );
}
