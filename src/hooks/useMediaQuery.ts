"use client";

import { useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result — for behaviour CSS breakpoints can't express on
 * their own, such as a different entrance animation per screen size. Reads
 * as `false` during server rendering, so layout itself should still come
 * from Tailwind breakpoint classes and only motion/behaviour from this.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
