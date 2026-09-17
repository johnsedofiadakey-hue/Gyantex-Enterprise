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
  { key: "primary", label: "Primary", hint: "Buttons, links, active states", cssVar: "--color-olive", default: "#FD0100" },
  { key: "secondary", label: "Text", hint: "Body text everywhere, plus headers, dark sections, and the admin sidebar", cssVar: "--color-charcoal", default: "#000000" },
  { key: "accent", label: "Accent", hint: "Badges and highlights (e.g. Best Seller)", cssVar: "--color-gold", default: "#FF00FC" },
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

/** Curated font pairings — every option is loaded via next/font/google in
 * layout.tsx (its own CSS variable, e.g. --font-montserrat), so switching just
 * repoints --font-sans/--font-serif at a different pair with no fetch or
 * reload. Kept to a short curated list (not a free-text field) so the site
 * can never end up with a broken or unreadable typeface — and every font
 * here was checked to contain the Twi letters Ɛ ɛ Ɔ ɔ. Option ids are
 * unchanged from the earlier pairings so a saved choice keeps working. */
export interface BrandFontOption {
  id: string;
  label: string;
  description: string;
  sansVar: string;
  serifVar: string;
}

export const BRAND_FONT_OPTIONS: BrandFontOption[] = [
  { id: "default", label: "Inter & Montserrat", description: "Clean and modern — the site's current look", sansVar: "var(--font-inter)", serifVar: "var(--font-montserrat)" },
  { id: "editorial", label: "Source Sans & Noto Serif", description: "Elegant and editorial — a fashion-magazine feel", sansVar: "var(--font-source-sans)", serifVar: "var(--font-noto-serif)" },
  { id: "modern", label: "Noto Sans & Onest", description: "Bold and contemporary — a crisp, confident feel", sansVar: "var(--font-noto-sans)", serifVar: "var(--font-onest)" },
  { id: "classic", label: "Source Sans & Libre Baskerville", description: "Warm and timeless — a literary, storybook feel", sansVar: "var(--font-source-sans)", serifVar: "var(--font-libre-baskerville)" },
];

export const DEFAULT_BRAND_FONT = "default";

function getBrandFontOption(fontId: string | undefined): BrandFontOption {
  return BRAND_FONT_OPTIONS.find((f) => f.id === fontId) ?? BRAND_FONT_OPTIONS[0];
}

export function applyBrandFont(fontId: string | undefined) {
  const option = getBrandFontOption(fontId);
  document.documentElement.style.setProperty("--font-sans", `${option.sansVar}, ui-sans-serif, system-ui, sans-serif`);
  document.documentElement.style.setProperty("--font-serif", `${option.serifVar}, ui-serif, Georgia, serif`);
}

/**
 * Storefront text sizes the owner picks in Admin → Settings → Branding.
 * `text` scales the whole storefront the way browser zoom does (it sets the
 * root font size, and every Tailwind size and spacing is in rem). `heading`
 * additionally scales headings — product names and page titles, i.e.
 * everything set in the heading font — on top of that. See globals.css for
 * how each is applied, and why the admin panel is exempt from both.
 */
export interface BrandSizeOption {
  id: string;
  label: string;
  scale: number;
}

export const BRAND_TEXT_SIZE_OPTIONS: BrandSizeOption[] = [
  { id: "small", label: "Small", scale: 0.9 },
  { id: "normal", label: "Normal", scale: 1 },
  { id: "large", label: "Large", scale: 1.125 },
  { id: "xlarge", label: "Extra large", scale: 1.25 },
];

export const BRAND_HEADING_SIZE_OPTIONS: BrandSizeOption[] = [
  { id: "small", label: "Small", scale: 0.85 },
  { id: "normal", label: "Normal", scale: 1 },
  { id: "large", label: "Large", scale: 1.2 },
  { id: "xlarge", label: "Extra large", scale: 1.4 },
];

export const DEFAULT_BRAND_SIZE = "normal";

export function getBrandSizeScale(options: BrandSizeOption[], sizeId: string | undefined): number {
  return (options.find((option) => option.id === sizeId) ?? options.find((option) => option.id === DEFAULT_BRAND_SIZE)!).scale;
}

export function applyBrandSizes(textSize: string | undefined, headingSize: string | undefined) {
  document.documentElement.style.setProperty("--site-text-scale", String(getBrandSizeScale(BRAND_TEXT_SIZE_OPTIONS, textSize)));
  document.documentElement.style.setProperty("--site-heading-scale", String(getBrandSizeScale(BRAND_HEADING_SIZE_OPTIONS, headingSize)));
}

/** Everything saved in the settings/branding Firestore doc. */
export type BrandSettings = Partial<BrandColors> & { font?: string; textSize?: string; headingSize?: string };

/**
 * The same CSS variables the apply* functions above set, as a plain style
 * object — rendered server-side onto <html> by the root layout so a visitor's
 * very first paint already has the owner's colours, fonts and text sizes,
 * instead of the defaults followed by a visible jump once the browser
 * fetches branding.
 */
export function getBrandingStyle(settings: BrandSettings): Record<string, string> {
  const style: Record<string, string> = {};
  for (const field of BRAND_COLOR_FIELDS) {
    const value = settings[field.key];
    if (typeof value === "string" && value) style[field.cssVar] = value;
  }
  const font = getBrandFontOption(settings.font);
  style["--font-sans"] = `${font.sansVar}, ui-sans-serif, system-ui, sans-serif`;
  style["--font-serif"] = `${font.serifVar}, ui-serif, Georgia, serif`;
  style["--site-text-scale"] = String(getBrandSizeScale(BRAND_TEXT_SIZE_OPTIONS, settings.textSize));
  style["--site-heading-scale"] = String(getBrandSizeScale(BRAND_HEADING_SIZE_OPTIONS, settings.headingSize));
  return style;
}
