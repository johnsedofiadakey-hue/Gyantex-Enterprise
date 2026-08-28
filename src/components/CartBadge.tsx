"use client";

import { useCartStore, useCartHydrated } from "@/store/useCartStore";

/**
 * The cart count is read from localStorage, so it's only known on the
 * client. Rendering it before hydration finishes would mismatch the
 * server-rendered HTML (which always shows an empty cart) — this waits.
 */
export default function CartBadge() {
  const hydrated = useCartHydrated();
  const count = useCartStore((state) => state.totalItems());

  if (!hydrated || count === 0) return null;

  return (
    <span className="absolute -top-1.5 -right-1.5 bg-olive text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
      {count}
    </span>
  );
}
