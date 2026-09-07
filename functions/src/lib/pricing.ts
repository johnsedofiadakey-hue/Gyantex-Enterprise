export type PurchaseType = 'full' | 'half';
export type PriceMode = 'fixed' | 'quote';

/** A selectable value within an option group — plain string values carry no price. */
export type ProductOptionValue = string | { label: string; price?: number };

export interface ProductOptionGroup {
  label: string;
  values: ProductOptionValue[];
}

export interface CartItemInput {
  productId: string;
  name?: string;
  price?: number;
  priceMode?: PriceMode;
  minimumOrder?: string;
  category?: string;
  color?: string;
  selections?: Record<string, string>;
  image?: string;
  purchaseType: PurchaseType;
  quantity: number;
}

export interface ProductPriceData {
  name?: string;
  price: number;
  priceMode?: PriceMode;
  trackInventory?: boolean;
  stockUnits?: number;
  reservedUnits?: number;
  optionGroups?: ProductOptionGroup[];
}

function optionValueLabel(value: ProductOptionValue): string {
  return typeof value === 'string' ? value : value.label;
}

function optionValuePrice(value: ProductOptionValue): number | undefined {
  return typeof value === 'string' ? undefined : value.price;
}

/**
 * Looks up the price attached to whatever the customer selected for each of
 * the product's own option groups (e.g. "Cloth Length: 12 Yards" → GHS 280).
 * Only server-side product data is consulted — the client's selections are
 * just labels used to look up a price, never a price themselves.
 */
function priceFromSelections(product: ProductPriceData, selections?: Record<string, string>): number | null {
  if (!product.optionGroups?.length || !selections) return null;

  let matched = false;
  let total = 0;
  for (const group of product.optionGroups) {
    const selectedLabel = selections[group.label];
    if (!selectedLabel) continue;
    const value = group.values.find((v) => optionValueLabel(v) === selectedLabel);
    const price = value ? optionValuePrice(value) : undefined;
    if (price !== undefined) {
      matched = true;
      total += price;
    }
  }

  return matched ? total : null;
}

export const DELIVERY_FEES: Record<string, number> = {
  pickup: 0,
  kumasi_delivery: 30,
  ghana_delivery: 50,
  // Legacy zones are kept so older carts/orders don't fail after the Gyantex
  // delivery rename.
  accra_central: 30,
  outside_accra: 50,
};

// Mirrors DEFAULT_PRODUCTS in src/lib/catalog.ts — the same fallback data
// the storefront shows when Firestore's `products` collection has no
// matching doc. These two tables MUST stay in sync: if the frontend price
// doesn't match what this table says, checkout for that product breaks
// outright (the server always wins, so it just silently rejects the order
// as "no price set yet" while the storefront shows a price that works fine
// to look at). Only price/priceMode/optionGroups/trackInventory matter here
// — this is price-computation input, not full product data.
const DEFAULT_PRODUCT_PRICE_DATA: Record<string, ProductPriceData> = {
  'funeral-memorial-cloth': {
    name: 'Funeral Memorial Cloth Design & Print',
    price: 150,
    priceMode: 'fixed',
    trackInventory: false,
  },
  'church-anniversary-cloth': {
    name: 'Church Program & Anniversary Cloth',
    price: 180,
    priceMode: 'fixed',
    trackInventory: false,
  },
  'school-custom-cloth': {
    name: 'School & Alumni Custom Cloth',
    price: 90,
    priceMode: 'fixed',
    trackInventory: false,
  },
  'institutional-branded-textile': {
    name: 'Institutional Branded Textile',
    price: 200,
    priceMode: 'fixed',
    trackInventory: false,
  },
  'event-souvenir-cloth': {
    name: 'Event Souvenir Cloth',
    price: 60,
    priceMode: 'fixed',
    trackInventory: false,
  },
  'ready-catalog-selection': {
    name: 'Ready Catalog Design Selection',
    price: 0,
    priceMode: 'quote',
    trackInventory: false,
  },
};

export function getDefaultProductPriceData(productId: string): ProductPriceData | null {
  return DEFAULT_PRODUCT_PRICE_DATA[productId] || null;
}

/** True if any option value on this product carries its own price — such a
 * product is sellable through that selection alone, even with no base price.
 * Mirrors src/lib/catalog.ts's hasPricedOptionValue. */
function hasPricedOptionValue(optionGroups?: ProductOptionGroup[]): boolean {
  return !!optionGroups?.some((group) => group.values.some((value) => optionValuePrice(value) !== undefined));
}

export function isQuoteProduct(product: ProductPriceData): boolean {
  if (hasPricedOptionValue(product.optionGroups)) return false;
  return product.priceMode === 'quote' || (product.price || 0) <= 0;
}

export function shouldTrackInventory(product: ProductPriceData): boolean {
  return product.trackInventory !== false && !isQuoteProduct(product) && typeof product.stockUnits === 'number';
}

/**
 * Price per unit for a single item, given its purchase type and whichever
 * priced option values it selected (e.g. cloth length). If any selected
 * option carries its own price, that replaces the product's base price.
 * Otherwise the base price is used — except when the product has NO base
 * price and relies entirely on option pricing (isQuoteProduct already
 * returned false for it on that basis): a missing/unmatched selection there
 * must reject rather than silently fall back to product.price=0, which
 * would let a cart item skip payment entirely. Half piece = half the result.
 */
export function computeItemUnitPrice(
  product: ProductPriceData,
  purchaseType: PurchaseType,
  selections?: Record<string, string>
): number {
  if (isQuoteProduct(product)) return 0;
  const selectedPrice = priceFromSelections(product, selections);
  if (selectedPrice === null && (product.price || 0) <= 0) {
    throw new Error(`"${product.name || 'An item'}" needs a size/option selected before it can be priced.`);
  }
  const base = selectedPrice ?? (product.price || 0);
  return purchaseType === 'half' ? base / 2 : base;
}

/**
 * Stock units consumed by an item. Stock is tracked in half-piece units:
 * a full piece consumes 2 units, a half piece consumes 1.
 */
export function computeUnitsForItem(item: { purchaseType: PurchaseType; quantity: number }): number {
  return item.purchaseType === 'full' ? item.quantity * 2 : item.quantity;
}

// `DELIVERY_FEES` is the last-resort default when Firestore's `deliveryZones`
// collection is empty — real fee data normally comes from there now (see
// getDeliveryFeeMap in index.ts) so the owner's Admin → Delivery edits are
// what checkout actually charges, not this table. Callers pass the live map
// in as `feeMap`; omitting it (as the tests below do) falls back to this.
export function computeDeliveryFee(zone: string, feeMap: Record<string, number> = DELIVERY_FEES): number {
  return feeMap[zone] ?? 0;
}

export function computeOrderTotals(
  items: CartItemInput[],
  products: Record<string, ProductPriceData>,
  deliveryZone: string,
  deliveryFeeMap: Record<string, number> = DELIVERY_FEES
): { subtotal: number; deliveryFee: number; total: number; hasQuoteItems: boolean } {
  let subtotal = 0;
  let hasQuoteItems = false;

  for (const item of items) {
    const product = products[item.productId];
    if (!product) {
      throw new Error(`Product ${item.productId} not found`);
    }
    if (isQuoteProduct(product)) {
      hasQuoteItems = true;
      continue;
    }
    subtotal += computeItemUnitPrice(product, item.purchaseType, item.selections) * item.quantity;
  }

  const deliveryFee = hasQuoteItems ? 0 : computeDeliveryFee(deliveryZone, deliveryFeeMap);
  return { subtotal, deliveryFee, total: subtotal + deliveryFee, hasQuoteItems };
}
