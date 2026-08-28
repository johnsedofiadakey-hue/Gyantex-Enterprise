/** The admin-facing brand colors and which CSS custom property each one
 * actually overrides. Every color utility class site-wide (bg-olive,
 * text-charcoal, bg-gold, and their /opacity variants) reads its color from
 * these same variables at runtime — see globals.css's `@theme` block — so
 * setting the variable is the entire mechanism. No component needs to know
 * this feature exists. */
export interface BrandColorField {
  key: "primary" | "secondary" | "accent" | "background";
  label: string;
  hint: string;
  cssVar: string;
  default: string;
}

export const BRAND_COLOR_FIELDS: BrandColorField[] = [
  { key: "primary", label: "Primary", hint: "Buttons, links, active states", cssVar: "--color-olive", default: "#5F6F52" },
  { key: "secondary", label: "Text", hint: "Body text everywhere, plus headers, dark sections, and the admin sidebar", cssVar: "--color-charcoal", default: "#171717" },
  { key: "accent", label: "Accent", hint: "Badges and highlights (e.g. Best Seller)", cssVar: "--color-gold", default: "#E3A93B" },
  { key: "background", label: "Background", hint: "Page and card background — keep it light so text stays readable", cssVar: "--color-white", default: "#FFFFFF" },
];

export type BrandColors = Record<BrandColorField["key"], string>;

export const DEFAULT_BRAND_COLORS: BrandColors = Object.fromEntries(
  BRAND_COLOR_FIELDS.map((field) => [field.key, field.default])
) as BrandColors;

/** Applies a set of brand colors to the live page immediately — used both
 * on initial load (BrandingProvider) and right after an admin saves a
 * change, so they see the result without a reload. */
export function applyBrandColors(colors: Partial<BrandColors>) {
  for (const field of BRAND_COLOR_FIELDS) {
    const value = colors[field.key];
    if (typeof value === "string" && value) {
      document.documentElement.style.setProperty(field.cssVar, value);
    }
  }
}

/** Curated font pairings — every option is preloaded via next/font/google in
 * layout.tsx (its own CSS variable, e.g. --font-lato), so switching just
 * repoints --font-sans/--font-serif at a different pair with no fetch or
 * reload. Kept to a short curated list (not a free-text field) so the site
 * can never end up with a broken or unreadable typeface. */
export interface BrandFontOption {
  id: string;
  label: string;
  description: string;
  sansVar: string;
  serifVar: string;
}

export const BRAND_FONT_OPTIONS: BrandFontOption[] = [
  { id: "default", label: "Inter & Poppins", description: "Clean and modern — the site's current look", sansVar: "var(--font-inter)", serifVar: "var(--font-poppins)" },
  { id: "editorial", label: "Lato & Playfair Display", description: "Elegant and editorial — a fashion-magazine feel", sansVar: "var(--font-lato)", serifVar: "var(--font-playfair)" },
  { id: "modern", label: "Work Sans & Space Grotesk", description: "Bold and geometric — a contemporary, tech-forward feel", sansVar: "var(--font-work-sans)", serifVar: "var(--font-space-grotesk)" },
  { id: "classic", label: "Source Sans & Libre Baskerville", description: "Warm and timeless — a literary, storybook feel", sansVar: "var(--font-source-sans)", serifVar: "var(--font-libre-baskerville)" },
];

export const DEFAULT_BRAND_FONT = "default";

export function applyBrandFont(fontId: string | undefined) {
  const option = BRAND_FONT_OPTIONS.find((f) => f.id === fontId) ?? BRAND_FONT_OPTIONS[0];
  document.documentElement.style.setProperty("--font-sans", `${option.sansVar}, ui-sans-serif, system-ui, sans-serif`);
  document.documentElement.style.setProperty("--font-serif", `${option.serifVar}, ui-serif, Georgia, serif`);
}
