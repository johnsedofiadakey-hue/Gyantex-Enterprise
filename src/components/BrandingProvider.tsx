"use client";

import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { applyBrandColors, applyBrandFont, type BrandColors } from "@/lib/branding";

/** Applies the owner's saved branding (Admin → Settings: colors + font
 * pairing) on top of the built-in defaults already baked into globals.css.
 * Renders nothing — mounted once in the root layout so it runs on every
 * page, admin included. One Firestore read per visit (not a live listener —
 * this changes rarely, no reason to keep a connection open for it), and
 * does nothing at all if the owner has never customized branding, so it
 * costs nothing extra for the common case. */
export default function BrandingProvider() {
  useEffect(() => {
    async function loadBranding() {
      try {
        const snap = await getDoc(doc(db, "settings", "branding"));
        if (snap.exists()) {
          const data = snap.data() as Partial<BrandColors> & { font?: string };
          applyBrandColors(data);
          applyBrandFont(data.font);
        }
      } catch (error) {
        console.error("Failed to load brand colors, using defaults", error);
      }
    }
    loadBranding();
  }, []);

  return null;
}
