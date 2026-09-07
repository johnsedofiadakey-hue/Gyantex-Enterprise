export type PriceMode = "fixed" | "quote";
export type SortOption = "recommended" | "category" | "az";

/** A selectable value within an option group. Plain strings carry no price; an
 * object value optionally sets the product's price when chosen (e.g. "12 Yards" → GHS 280). */
export type ProductOptionValue = string | { label: string; price?: number };

/** A customer-facing choice group on a product — e.g. Cloth Length: [6 Yards, 12 Yards, Full Piece]. */
export interface ProductOptionGroup {
  label: string;
  values: ProductOptionValue[];
}

export function getOptionValueLabel(value: ProductOptionValue): string {
  return typeof value === "string" ? value : value.label;
}

export function getOptionValuePrice(value: ProductOptionValue): number | undefined {
  return typeof value === "string" ? undefined : value.price;
}

/** Sums the price of whichever option value is selected in each group — e.g.
 * "Cloth Length: 12 Yards" — or returns null if nothing selected carries a price. */
export function getSelectedOptionsPrice(
  optionGroups: ProductOptionGroup[] | undefined,
  selectedOptions: Record<string, string>
): number | null {
  if (!optionGroups?.length) return null;
  let matched = false;
  let total = 0;
  for (const group of optionGroups) {
    const selectedLabel = selectedOptions[group.label];
    const value = group.values.find((v) => getOptionValueLabel(v) === selectedLabel);
    const price = value ? getOptionValuePrice(value) : undefined;
    if (price !== undefined) {
      matched = true;
      total += price;
    }
  }
  return matched ? total : null;
}

/** Resolves a product's colors, falling back to the legacy hex/name arrays when
 * no structured colorOptions (with per-color photos) have been set yet. */
/** Inline style for a color swatch — a solid circle, or a split circle when
 * the option has a second color (e.g. a "Red & Black" combo cloth). */
export function getSwatchStyle(color: Pick<ProductColorOption, "hex" | "hex2">): { backgroundColor: string } | { background: string } {
  if (color.hex2) {
    return { background: `conic-gradient(${color.hex} 0deg 180deg, ${color.hex2} 180deg 360deg)` };
  }
  return { backgroundColor: color.hex };
}

export function getProductColorOptions(
  product: Pick<CatalogProduct, "colorOptions" | "colors" | "colorNames">
): ProductColorOption[] {
  if (product.colorOptions?.length) return product.colorOptions;
  const colors = product.colors || [];
  const names = product.colorNames || [];
  return colors.map((hex, index) => ({ hex, name: names[index] || hex }));
}

/** A color a customer can pick, with the actual photo of the cloth in that color.
 * `hex2` is optional — when set, the swatch renders as a split circle (e.g. a
 * "Red & Black" combo cloth) instead of a single solid color. */
export interface ProductColorOption {
  name: string;
  hex: string;
  hex2?: string;
  image?: string;
}

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  priceMode?: PriceMode;
  startingPriceLabel?: string;
  unit?: string;
  imageUrl: string;
  gallery?: string[];
  colors: string[];
  colorNames?: string[];
  colorOptions?: ProductColorOption[];
  optionGroups?: ProductOptionGroup[];
  badge?: string;
  featured?: boolean;
  category: string;
  description: string;
  highlights: string[];
  details: Array<{ label: string; value: string }>;
  tags: string[];
  turnaround?: string;
  minimumOrder?: string;
  madeToOrder?: boolean;
  trackInventory?: boolean;
}

export const CATEGORY_OPTIONS = [
  "All",
  "Funeral Cloth",
  "Church Cloth",
  "School Cloth",
  "Institutions",
  "Souvenir",
  "Ready Catalog",
];

export const STORE_NAV = [
  { label: "Funeral Cloth", category: "Funeral Cloth" },
  { label: "Churches", category: "Church Cloth" },
  { label: "Schools", category: "School Cloth" },
  { label: "Institutions", category: "Institutions" },
  { label: "Catalog", category: "All" },
];

/** Earlier catalog data used "Institutional" — kept so old Firestore docs still match. */
const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  Institutional: "Institutions",
};

export function normalizeCategory(category: string): string {
  return LEGACY_CATEGORY_ALIASES[category] || category;
}

/** A splash of color per category so the catalog reads as textile, not spreadsheet. */
export interface CategoryAccent {
  chip: string;
  dot: string;
  active: string;
}

const DEFAULT_ACCENT: CategoryAccent = {
  chip: "bg-soft-grey text-charcoal/70",
  dot: "bg-charcoal/40",
  active: "bg-charcoal text-white",
};

const CATEGORY_ACCENTS: Record<string, CategoryAccent> = {
  "Funeral Cloth": { chip: "bg-clay/10 text-clay", dot: "bg-clay", active: "bg-clay text-white" },
  "Church Cloth": { chip: "bg-teal/10 text-teal", dot: "bg-teal", active: "bg-teal text-white" },
  "School Cloth": { chip: "bg-gold/15 text-[#8a6015]", dot: "bg-gold", active: "bg-gold text-charcoal" },
  Institutions: { chip: "bg-olive/10 text-olive", dot: "bg-olive", active: "bg-olive text-white" },
  Souvenir: { chip: "bg-terracotta/10 text-terracotta", dot: "bg-terracotta", active: "bg-terracotta text-white" },
  "Ready Catalog": { chip: "bg-teal/10 text-teal", dot: "bg-teal", active: "bg-teal text-white" },
};

export function getCategoryAccent(category: string): CategoryAccent {
  return CATEGORY_ACCENTS[category] || DEFAULT_ACCENT;
}

/** A category the owner has defined in Firestore, editable from Admin → Categories. */
export interface Category {
  id: string;
  name: string;
  order: number;
}

/** Falls back to these when the `categories` collection is empty — mirrors
 * CATEGORY_OPTIONS (minus "All", which is a storefront-filter concept, not a category). */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "default-funeral-cloth", name: "Funeral Cloth", order: 0 },
  { id: "default-church-cloth", name: "Church Cloth", order: 1 },
  { id: "default-school-cloth", name: "School Cloth", order: 2 },
  { id: "default-institutions", name: "Institutions", order: 3 },
  { id: "default-souvenir", name: "Souvenir", order: 4 },
  { id: "default-ready-catalog", name: "Ready Catalog", order: 5 },
];

/** A pickup/delivery choice the owner has defined in Firestore, editable from
 * Admin → Delivery. The `id` is what's stored on every cart/order as
 * `deliveryZone` — the same value the server uses to independently look up
 * the fee, so it must stay stable once real orders reference it (rename the
 * label freely, but treat the id as permanent). */
export interface DeliveryZone {
  id: string;
  label: string;
  description: string;
  fee: number;
  order: number;
  active: boolean;
}

/** Falls back to these when the `deliveryZones` collection is empty. */
export const DEFAULT_DELIVERY_ZONES: DeliveryZone[] = [
  { id: "pickup", label: "Pickup at Kejetia", description: "Kumasi inside Kejetia Gate 11, Shop No. F-1472", fee: 0, order: 0, active: true },
  { id: "kumasi_delivery", label: "Kumasi delivery", description: "Delivery fee is confirmed with your location.", fee: 30, order: 1, active: true },
  { id: "ghana_delivery", label: "Delivery outside Kumasi", description: "Nationwide delivery is arranged after order confirmation.", fee: 50, order: 2, active: true },
];

export const DEFAULT_PRODUCTS: CatalogProduct[] = [
  {
    id: "funeral-memorial-cloth",
    name: "Funeral Memorial Cloth Design & Print",
    // DEMO PRICE — placeholder for testing, replace with a real price in Admin → Products.
    price: 150,
    priceMode: "fixed",
    startingPriceLabel: "Price not set yet",
    unit: "project",
    imageUrl: "/images/gyantex-market-wax-print-rolls.jpg",
    gallery: ["/images/gyantex-market-wax-print-rolls.jpg", "/images/gyantex-market-wax-print-stall.jpg"],
    // Real varieties per the client (Akan funeral cloth colors) — Kobene (red)
    // and Kuntunkuni (black & white). "Lace" is a separate fabric line, not a
    // color of this cloth — needs its own product once real details are in.
    // No per-color photo yet: couldn't find a genuinely Ghana-sourced, folded
    // (not worn) photo of each — see conversation notes. Wire one in via
    // Admin → Products the moment real photos of the finished cloth exist.
    colors: ["#9c2b1f", "#1a1a1a"],
    colorNames: ["Red", "Black & White"],
    colorOptions: [
      { name: "Red", hex: "#9c2b1f" },
      { name: "Black & White", hex: "#1a1a1a" },
    ],
    badge: "Most requested",
    featured: true,
    category: "Funeral Cloth",
    description:
      "Custom memorial textile design and printing for funeral families, associations, and funeral committees.",
    highlights: [
      "Portrait and name layout support",
      "Family, church, or association branding",
      "Design guidance before printing",
    ],
    details: [
      { label: "Best for", value: "Funerals, memorial services, family cloth" },
      { label: "Ordering", value: "Share the name, photo, date, quantity, and preferred colors" },
      { label: "Fulfillment", value: "Pickup in Kejetia or delivery arranged after confirmation" },
    ],
    tags: ["funeral", "memorial", "cloth", "portrait", "family", "custom print"],
    turnaround: "Confirmed during quote",
    minimumOrder: "Depends on design and fabric choice",
    madeToOrder: true,
    trackInventory: false,
  },
  {
    id: "church-anniversary-cloth",
    name: "Church Program & Anniversary Cloth",
    // DEMO PRICE — placeholder for testing, replace with a real price in Admin → Products.
    price: 180,
    priceMode: "fixed",
    startingPriceLabel: "Price not set yet",
    unit: "project",
    imageUrl: "/images/gyantex-market-wax-print-stall.jpg",
    gallery: ["/images/gyantex-market-wax-print-stall.jpg", "/images/gyantex-market-wax-print-rolls.jpg"],
    colors: ["#101010", "#ffffff", "#254c78", "#d5a843"],
    colorNames: ["Black", "White", "Royal Blue", "Gold"],
    colorOptions: [
      { name: "Black", hex: "#101010", image: "/images/gyantex-market-wax-print-stall.jpg" },
      { name: "White", hex: "#ffffff", image: "/images/gyantex-market-wax-print-rolls.jpg" },
      { name: "Royal Blue", hex: "#254c78" },
      { name: "Gold", hex: "#d5a843" },
    ],
    badge: "For groups",
    featured: true,
    category: "Church Cloth",
    description:
      "Custom printed cloth for church anniversaries, conventions, harvests, choir groups, and ministry programs.",
    highlights: [
      "Church logo and theme integration",
      "Pattern options for large groups",
      "WhatsApp review before final print",
    ],
    details: [
      { label: "Best for", value: "Anniversaries, conventions, choir uniforms, harvest programs" },
      { label: "Ordering", value: "Send logo, theme, date, colors, and estimated quantity" },
      { label: "Fulfillment", value: "Pickup or delivery/distribution planning after quote" },
    ],
    tags: ["church", "anniversary", "choir", "harvest", "convention", "custom cloth"],
    turnaround: "Confirmed during quote",
    minimumOrder: "Depends on quantity and fabric choice",
    madeToOrder: true,
    trackInventory: false,
  },
  {
    id: "school-custom-cloth",
    name: "School & Alumni Custom Cloth",
    // DEMO PRICE — placeholder for testing, replace with a real price in Admin → Products.
    price: 90,
    priceMode: "fixed",
    startingPriceLabel: "Price not set yet",
    unit: "piece",
    imageUrl: "/images/gyantex-market-wax-print-rolls.jpg",
    gallery: ["/images/gyantex-market-wax-print-rolls.jpg", "/images/gyantex-market-wax-print-stall.jpg"],
    colors: ["#0d0d0d", "#f7f7f2", "#1f4d3a", "#7b1e2b"],
    colorNames: ["Black", "White", "Green", "Burgundy"],
    badge: "School events",
    category: "School Cloth",
    description:
      "Designed textile cloth for schools, alumni groups, graduations, durbars, reunions, and institutional events.",
    highlights: [
      "School crest and year-group layout",
      "Event names and dates included",
      "Clean repeat pattern options",
    ],
    details: [
      { label: "Best for", value: "Schools, alumni groups, graduations, durbars, reunions" },
      { label: "Ordering", value: "Send crest/logo, school colors, event name, date, and quantity" },
      { label: "Fulfillment", value: "Pickup in Kumasi or delivery arranged after confirmation" },
    ],
    tags: ["school", "alumni", "graduation", "uniform", "institution", "custom print"],
    turnaround: "Confirmed during quote",
    minimumOrder: "Depends on quantity and fabric choice",
    madeToOrder: true,
    trackInventory: false,
  },
  {
    id: "institutional-branded-textile",
    name: "Institutional Branded Textile",
    // DEMO PRICE — placeholder for testing, replace with a real price in Admin → Products.
    price: 200,
    priceMode: "fixed",
    startingPriceLabel: "Price not set yet",
    unit: "project",
    imageUrl: "/images/gyantex-market-wax-print-stall.jpg",
    gallery: ["/images/gyantex-market-wax-print-stall.jpg", "/images/gyantex-market-wax-print-rolls.jpg"],
    colors: ["#111111", "#f5f5f0", "#253858", "#8d6f2f"],
    colorNames: ["Black", "Ivory", "Navy", "Bronze"],
    badge: "Custom design",
    category: "Institutions",
    description:
      "Custom textile designs for institutions, associations, businesses, local groups, and formal programs.",
    highlights: [
      "Logo-led repeat patterns",
      "Multiple colorway concepts",
      "Designed for group orders",
    ],
    details: [
      { label: "Best for", value: "Institutions, associations, companies, local groups" },
      { label: "Ordering", value: "Send brand assets, event purpose, preferred colors, and quantity" },
      { label: "Fulfillment", value: "Pickup or delivery arranged after payment confirmation" },
    ],
    tags: ["institution", "association", "business", "logo", "branded cloth", "custom textile"],
    turnaround: "Confirmed during quote",
    minimumOrder: "Depends on quantity and fabric choice",
    madeToOrder: true,
    trackInventory: false,
  },
  {
    id: "event-souvenir-cloth",
    name: "Event Souvenir Cloth",
    // DEMO PRICE — placeholder for testing, replace with a real price in Admin → Products.
    price: 60,
    priceMode: "fixed",
    startingPriceLabel: "Price not set yet",
    unit: "piece",
    imageUrl: "/images/gyantex-market-wax-print-rolls.jpg",
    gallery: ["/images/gyantex-market-wax-print-rolls.jpg", "/images/gyantex-market-wax-print-stall.jpg"],
    colors: ["#111111", "#ffffff", "#525252", "#7f1d1d"],
    colorNames: ["Black", "White", "Slate", "Deep Red"],
    badge: "Events",
    category: "Souvenir",
    description:
      "Printed cloth for personal celebrations, branded souvenirs, community events, and special occasions.",
    highlights: [
      "Memorable custom layouts",
      "Event details and names included",
      "Suitable for group distribution",
    ],
    details: [
      { label: "Best for", value: "Celebrations, launches, associations, community events" },
      { label: "Ordering", value: "Send event details, style direction, colors, and estimated quantity" },
      { label: "Fulfillment", value: "Pickup or delivery arranged after confirmation" },
    ],
    tags: ["event", "souvenir", "celebration", "custom cloth", "textile print"],
    turnaround: "Confirmed during quote",
    minimumOrder: "Depends on quantity and fabric choice",
    madeToOrder: true,
    trackInventory: false,
  },
  {
    id: "ready-catalog-selection",
    name: "Ready Catalog Design Selection",
    price: 0,
    priceMode: "quote",
    startingPriceLabel: "Ask for current catalog",
    unit: "selection",
    imageUrl: "/images/gyantex-market-wax-print-stall.jpg",
    gallery: ["/images/gyantex-market-wax-print-stall.jpg", "/images/gyantex-market-wax-print-rolls.jpg"],
    colors: ["#111111", "#ffffff", "#5b2f8f", "#d43f3a"],
    colorNames: ["Black", "White", "Purple", "Red"],
    badge: "WhatsApp catalog",
    category: "Ready Catalog",
    description:
      "Browse current Gyantex catalog samples and request a similar pattern or a fresh custom variation.",
    highlights: [
      "Start from existing samples",
      "Fast WhatsApp review",
      "Good for customers who need direction",
    ],
    details: [
      { label: "Best for", value: "Customers choosing from existing sample directions" },
      { label: "Ordering", value: "Share screenshots or catalog item references over WhatsApp" },
      { label: "Fulfillment", value: "Confirmed after design, fabric, quantity, and payment discussion" },
    ],
    tags: ["catalog", "samples", "ready design", "whatsapp catalog", "textile"],
    turnaround: "Confirmed during quote",
    minimumOrder: "Depends on selected fabric and print method",
    madeToOrder: true,
    trackInventory: false,
  },
];

export function getDefaultProduct(id: string) {
  return DEFAULT_PRODUCTS.find((product) => product.id === id) ?? null;
}

/** True if any option value on this product carries its own price — such a
 * product is sellable through that selection alone, even with no base price. */
export function hasPricedOptionValue(optionGroups: ProductOptionGroup[] | undefined): boolean {
  return !!optionGroups?.some((group) => group.values.some((value) => getOptionValuePrice(value) !== undefined));
}

export function isQuoteProduct(product: Pick<CatalogProduct, "price" | "priceMode" | "optionGroups">) {
  if (hasPricedOptionValue(product.optionGroups)) return false;
  return product.priceMode === "quote" || product.price <= 0;
}

/** Lowest priced value across a product's option groups, or null if none
 * carry a price — used to show "From GHS X" when there's no base price. */
function getLowestOptionPrice(optionGroups: ProductOptionGroup[] | undefined): number | null {
  let lowest: number | null = null;
  for (const group of optionGroups || []) {
    for (const value of group.values) {
      const price = getOptionValuePrice(value);
      if (price !== undefined && (lowest === null || price < lowest)) lowest = price;
    }
  }
  return lowest;
}

export function getPriceLabel(
  product: Pick<CatalogProduct, "price" | "priceMode" | "startingPriceLabel" | "unit" | "optionGroups">
) {
  if (isQuoteProduct(product)) return product.startingPriceLabel || "Price not set yet";
  const unitSuffix = product.unit ? ` / ${product.unit}` : "";
  if (product.price > 0) return `GHS ${product.price.toFixed(2)}${unitSuffix}`;
  const lowestOptionPrice = getLowestOptionPrice(product.optionGroups);
  return lowestOptionPrice !== null
    ? `From GHS ${lowestOptionPrice.toFixed(2)}${unitSuffix}`
    : product.startingPriceLabel || "Price not set yet";
}

export function normalizeCatalogProduct(id: string, data: Partial<CatalogProduct>): CatalogProduct {
  const fallback = getDefaultProduct(id);
  return {
    id,
    name: data.name || fallback?.name || "Custom Textile Order",
    price: Number(data.price ?? fallback?.price ?? 0),
    priceMode: data.priceMode || fallback?.priceMode || (Number(data.price ?? fallback?.price ?? 0) > 0 ? "fixed" : "quote"),
    startingPriceLabel: data.startingPriceLabel || fallback?.startingPriceLabel,
    unit: data.unit || fallback?.unit || "",
    imageUrl: data.imageUrl || fallback?.imageUrl || "/placeholder.svg",
    gallery: data.gallery || fallback?.gallery,
    colors: data.colors?.length ? data.colors : fallback?.colors || ["#111111"],
    colorNames: data.colorNames || fallback?.colorNames,
    colorOptions: data.colorOptions?.length ? data.colorOptions : fallback?.colorOptions,
    optionGroups: data.optionGroups?.length ? data.optionGroups : fallback?.optionGroups,
    badge: data.badge || fallback?.badge,
    featured: data.featured ?? fallback?.featured ?? false,
    category: normalizeCategory(data.category || fallback?.category || "Ready Catalog"),
    description: data.description || fallback?.description || "Custom textile design and print service.",
    highlights: data.highlights?.length ? data.highlights : fallback?.highlights || [],
    details: data.details?.length ? data.details : fallback?.details || [],
    tags: data.tags?.length ? data.tags : fallback?.tags || [],
    turnaround: data.turnaround || fallback?.turnaround,
    minimumOrder: data.minimumOrder || fallback?.minimumOrder,
    madeToOrder: data.madeToOrder ?? fallback?.madeToOrder ?? true,
    trackInventory: data.trackInventory ?? fallback?.trackInventory ?? false,
  };
}
