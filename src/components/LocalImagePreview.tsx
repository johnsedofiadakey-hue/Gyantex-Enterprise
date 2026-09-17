"use client";

import { useEffect, useRef } from "react";

interface LocalImagePreviewProps {
  file: File;
  alt: string;
  className?: string;
}

/**
 * Instant thumbnail of a photo the owner has just picked but not yet
 * uploaded (uploads only happen on Save). The object URL is created and
 * revoked inside the effect and written straight to the <img>, rather than
 * held in state, so it never leaks a blob and survives React's dev-mode
 * double effect run.
 */
export default function LocalImagePreview({ file, alt, className = "" }: LocalImagePreviewProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) imageRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // A local blob: preview — next/image can't optimise it, and it never
  // reaches the public site, so a plain <img> is the right element here.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={imageRef} alt={alt} className={`h-full w-full object-cover ${className}`} />;
}
