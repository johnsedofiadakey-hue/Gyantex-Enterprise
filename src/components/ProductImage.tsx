"use client";

import Image from "next/image";
import { useState } from "react";
import { PLACEHOLDER_IMAGE } from "@/lib/config";

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export default function ProductImage({
  src,
  alt,
  className = "",
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
}: ProductImageProps) {
  const resolvedSrc = src || PLACEHOLDER_IMAGE;

  // Reset the error fallback whenever the requested image changes, per
  // React's "adjust state during render" pattern (no effect needed).
  const [trackedSrc, setTrackedSrc] = useState(resolvedSrc);
  const [failed, setFailed] = useState(false);
  if (trackedSrc !== resolvedSrc) {
    setTrackedSrc(resolvedSrc);
    setFailed(false);
  }

  const currentSrc = failed ? PLACEHOLDER_IMAGE : resolvedSrc;
  const isSvg = currentSrc.endsWith(".svg");

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      unoptimized={isSvg}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
