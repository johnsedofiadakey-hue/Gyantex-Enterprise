"use client";

import { useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { applyBrandColors, applyBrandFont, applyBrandSizes, type BrandSettings } from "@/lib/branding";

/** Applies the owner's saved branding (Admin → Settings: colors, font
 * pairing and text sizes) in the browser. The root layout already renders
 * these onto <html> server-side for the first paint; this keeps pages that
 * were prerendered at build time (terms, privacy, …) in step with any change
 * saved since. Renders nothing — mounted once in the root layout so it runs on every
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
          const data = snap.data() as BrandSettings;
          applyBrandColors(data);
          applyBrandFont(data.font);
          applyBrandSizes(data.textSize, data.headingSize);
        }
      } catch (error) {
        console.error("Failed to load brand colors, using defaults", error);
      }
    }
    loadBranding();
  }, []);

  return null;
}
