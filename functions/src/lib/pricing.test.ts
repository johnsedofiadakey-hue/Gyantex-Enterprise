import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  computeItemUnitPrice,
  computeOrderTotals,
  computeUnitsForItem,
  getDefaultProductPriceData,
  isQuoteProduct,
  shouldTrackInventory,
} from './pricing';

test('half piece is priced at exactly half the full-piece price for fixed products', () => {
  assert.equal(computeItemUnitPrice({ price: 100, priceMode: 'fixed' }, 'full'), 100);
  assert.equal(computeItemUnitPrice({ price: 100, priceMode: 'fixed' }, 'half'), 50);
});

test('quote products do not produce a payable unit price', () => {
  assert.equal(computeItemUnitPrice({ price: 0, priceMode: 'quote' }, 'full'), 0);
  assert.equal(computeItemUnitPrice({ price: 100, priceMode: 'quote' }, 'half'), 0);
});

test('a full piece consumes 2 stock units, a half piece consumes 1', () => {
  assert.equal(computeUnitsForItem({ purchaseType: 'full', quantity: 3 }), 6);
  assert.equal(computeUnitsForItem({ purchaseType: 'half', quantity: 3 }), 3);
});

test('order totals ignore any client-supplied price and recompute from server product data', () => {
  const items = [
    { productId: 'p1', purchaseType: 'full' as const, quantity: 2, price: 1 },
    { productId: 'p2', purchaseType: 'half' as const, quantity: 1, price: 1 },
  ];
  const products = {
    p1: { price: 85, priceMode: 'fixed' as const },
    p2: { price: 420, priceMode: 'fixed' as const },
  };
  const { subtotal, deliveryFee, total, hasQuoteItems } = computeOrderTotals(items, products, 'kumasi_delivery');
  assert.equal(subtotal, 85 * 2 + 420 / 2);
  assert.equal(deliveryFee, 30);
  assert.equal(total, subtotal + 30);
  assert.equal(hasQuoteItems, false);
});

test('quote-only carts do not charge delivery before the brief is reviewed', () => {
  const items = [
    { productId: 'ready-catalog-selection', purchaseType: 'full' as const, quantity: 1 },
  ];
  const products = {
    'ready-catalog-selection': getDefaultProductPriceData('ready-catalog-selection')!,
  };
  const { subtotal, deliveryFee, total, hasQuoteItems } = computeOrderTotals(items, products, 'ghana_delivery');
  assert.equal(subtotal, 0);
  assert.equal(deliveryFee, 0);
  assert.equal(total, 0);
  assert.equal(hasQuoteItems, true);
});

test('unknown delivery zone defaults to zero fee rather than throwing', () => {
  assert.equal(
    computeOrderTotals([{ productId: 'p1', purchaseType: 'full', quantity: 1 }], { p1: { price: 10 } }, 'mars').deliveryFee,
    0
  );
});

test('a cart referencing a product missing from the server-fetched product map is rejected', () => {
  assert.throws(() =>
    computeOrderTotals([{ productId: 'ghost', purchaseType: 'full', quantity: 1 }], {}, 'pickup')
  );
});

test('quote products and explicitly untracked products do not reserve inventory', () => {
  assert.equal(shouldTrackInventory({ price: 0, priceMode: 'quote', stockUnits: 100 }), false);
  assert.equal(shouldTrackInventory({ price: 100, priceMode: 'fixed', stockUnits: 100, trackInventory: false }), false);
  assert.equal(shouldTrackInventory({ price: 100, priceMode: 'fixed', stockUnits: 100 }), true);
});

test('a priced option value (e.g. cloth length) overrides the product base price', () => {
  const product = {
    price: 150,
    priceMode: 'fixed' as const,
    optionGroups: [
      { label: 'Cloth Length', values: [{ label: '6 Yards', price: 150 }, { label: '12 Yards', price: 280 }, '24 Yards'] },
    ],
  };
  assert.equal(computeItemUnitPrice(product, 'full', { 'Cloth Length': '12 Yards' }), 280);
  assert.equal(computeItemUnitPrice(product, 'half', { 'Cloth Length': '12 Yards' }), 140);
});

test('an unpriced or unmatched option selection falls back to the product base price', () => {
  const product = {
    price: 150,
    priceMode: 'fixed' as const,
    optionGroups: [
      { label: 'Cloth Length', values: [{ label: '6 Yards', price: 150 }, '24 Yards'] },
    ],
  };
  assert.equal(computeItemUnitPrice(product, 'full', { 'Cloth Length': '24 Yards' }), 150);
  assert.equal(computeItemUnitPrice(product, 'full', {}), 150);
  assert.equal(computeItemUnitPrice(product, 'full'), 150);
});

test('a client cannot forge a lower price by sending a fabricated selection label', () => {
  const product = {
    price: 500,
    priceMode: 'fixed' as const,
    optionGroups: [{ label: 'Cloth Length', values: [{ label: '12 Yards', price: 280 }] }],
  };
  // "6 Yards" was never offered on this product — no match, so the real base price holds.
  assert.equal(computeItemUnitPrice(product, 'full', { 'Cloth Length': '6 Yards' }), 500);
});

test('a product with no base price but priced option values is sellable, not a quote item', () => {
  const product = {
    price: 0,
    priceMode: 'quote' as const,
    optionGroups: [
      { label: 'Size', values: [{ label: '12 yards', price: 300 }, { label: '6 yards', price: 150 }, { label: '3 yards', price: 75 }] },
    ],
  };
  assert.equal(isQuoteProduct(product), false);
  assert.equal(computeItemUnitPrice(product, 'full', { Size: '6 yards' }), 150);
  assert.equal(computeItemUnitPrice(product, 'half', { Size: '12 yards' }), 150);
});

test('a zero-price, option-only product rejects instead of silently charging 0 when nothing was selected', () => {
  const product = {
    price: 0,
    priceMode: 'quote' as const,
    optionGroups: [{ label: 'Size', values: [{ label: '12 yards', price: 300 }] }],
  };
  assert.throws(() => computeItemUnitPrice(product, 'full', {}));
  assert.throws(() => computeItemUnitPrice(product, 'full'));
  // A genuinely unmatched label on an otherwise-priced product is the same failure, not a free item.
  assert.throws(() => computeItemUnitPrice(product, 'full', { Size: 'not a real option' }));
});

test('order totals sum priced option selections across a multi-item cart', () => {
  const items = [
    { productId: 'p1', purchaseType: 'full' as const, quantity: 2, selections: { Length: '12 Yards' } },
    { productId: 'p2', purchaseType: 'full' as const, quantity: 1 },
  ];
  const products = {
    p1: { price: 150, priceMode: 'fixed' as const, optionGroups: [{ label: 'Length', values: [{ label: '12 Yards', price: 280 }] }] },
    p2: { price: 60, priceMode: 'fixed' as const },
  };
  const { subtotal } = computeOrderTotals(items, products, 'pickup');
  assert.equal(subtotal, 280 * 2 + 60);
});

test('a priced color/variant swatch (e.g. "Gold — Lace") overrides the product base price', () => {
  const product = {
    price: 300,
    priceMode: 'fixed' as const,
    colorOptions: [{ name: 'Red' }, { name: 'Gold — Lace', price: 450 }],
  };
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold — Lace'), 450);
  assert.equal(computeItemUnitPrice(product, 'half', undefined, 'Gold — Lace'), 225);
  // An unpriced color (or none selected) falls back to the base price.
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Red'), 300);
  assert.equal(computeItemUnitPrice(product, 'full'), 300);
});

test('a client cannot forge a lower price by sending a fabricated color name', () => {
  const product = {
    price: 500,
    priceMode: 'fixed' as const,
    colorOptions: [{ name: 'Gold — Lace', price: 450 }],
  };
  // "Fake Color" was never offered on this product — no match, so the real base price holds.
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Fake Color'), 500);
});

test('a priced color wins over a priced option selection when both are present', () => {
  const product = {
    price: 150,
    priceMode: 'fixed' as const,
    colorOptions: [{ name: 'Gold — Lace', price: 450 }],
    optionGroups: [{ label: 'Length', values: [{ label: '12 Yards', price: 280 }] }],
  };
  assert.equal(computeItemUnitPrice(product, 'full', { Length: '12 Yards' }, 'Gold — Lace'), 450);
});

test('a product with no base price but a priced color is sellable, not a quote item', () => {
  const product = {
    price: 0,
    priceMode: 'quote' as const,
    colorOptions: [{ name: 'Gold — Lace', price: 450 }],
  };
  assert.equal(isQuoteProduct(product), false);
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold — Lace'), 450);
  assert.throws(() => computeItemUnitPrice(product, 'full'));
});

test('order totals include a priced color selection', () => {
  const items = [{ productId: 'p1', purchaseType: 'full' as const, quantity: 2, color: 'Gold — Lace' }];
  const products = {
    p1: { price: 300, priceMode: 'fixed' as const, colorOptions: [{ name: 'Red' }, { name: 'Gold — Lace', price: 450 }] },
  };
  const { subtotal } = computeOrderTotals(items, products, 'pickup');
  assert.equal(subtotal, 450 * 2);
});

// --- Unified variants (the current, single mechanism) ---

test('a priced variant row (color + size together) overrides the product base price', () => {
  const product = {
    price: 300,
    priceMode: 'fixed' as const,
    variants: [
      { color: 'Gold', size: '12 Yards', price: 450 },
      { color: 'Gold', size: 'Full Piece', price: 600 },
      { color: 'Red', size: 'Full Piece', price: 300 },
    ],
  };
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold', '12 Yards'), 450);
  assert.equal(computeItemUnitPrice(product, 'half', undefined, 'Gold', '12 Yards'), 225);
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold', 'Full Piece'), 600);
});

test('a variant row can be color-only or size-only and still match correctly', () => {
  const colorOnly = { price: 300, priceMode: 'fixed' as const, variants: [{ color: 'Gold', price: 350 }] };
  assert.equal(computeItemUnitPrice(colorOnly, 'full', undefined, 'Gold'), 350);

  const sizeOnly = { price: 150, priceMode: 'fixed' as const, variants: [{ size: '12 Yards', price: 280 }] };
  assert.equal(computeItemUnitPrice(sizeOnly, 'full', undefined, undefined, '12 Yards'), 280);
});

test('a client cannot forge a lower price by sending a fabricated variant color/size pair', () => {
  const product = {
    price: 500,
    priceMode: 'fixed' as const,
    variants: [{ color: 'Gold', size: '12 Yards', price: 450 }],
  };
  // Right color, wrong size (and vice versa) — neither is a real row, so the base price holds.
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold', 'Full Piece'), 500);
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Fake Color', '12 Yards'), 500);
});

test('a product with no base price but a priced variant is sellable, not a quote item', () => {
  const product = {
    price: 0,
    priceMode: 'quote' as const,
    variants: [{ color: 'Gold', size: '12 Yards', price: 450 }],
  };
  assert.equal(isQuoteProduct(product), false);
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold', '12 Yards'), 450);
  assert.throws(() => computeItemUnitPrice(product, 'full'));
});

test('order totals include a priced variant selection', () => {
  const items = [{ productId: 'p1', purchaseType: 'full' as const, quantity: 2, color: 'Gold', size: '12 Yards' }];
  const products = {
    p1: { price: 300, priceMode: 'fixed' as const, variants: [{ color: 'Gold', size: '12 Yards', price: 450 }] },
  };
  const { subtotal } = computeOrderTotals(items, products, 'pickup');
  assert.equal(subtotal, 450 * 2);
});

test('a migrated product (variants set) ignores any leftover legacy colorOptions/optionGroups data', () => {
  const product = {
    price: 300,
    priceMode: 'fixed' as const,
    variants: [{ color: 'Gold', price: 450 }],
    // Stale data that would resolve differently under the old mechanism —
    // must not be consulted once variants exists and has its own match.
    colorOptions: [{ name: 'Gold', price: 999 }],
  };
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold'), 450);
});

// --- Per-variant "in stock" ---

test('a variant explicitly marked out of stock rejects the sale even though it has a real price', () => {
  const product = {
    price: 300,
    priceMode: 'fixed' as const,
    variants: [{ color: 'Gold', price: 450, inStock: false }],
  };
  assert.throws(() => computeItemUnitPrice(product, 'full', undefined, 'Gold'));
});

test('a variant with inStock left unset (or explicitly true) sells normally', () => {
  const product = {
    price: 300,
    priceMode: 'fixed' as const,
    variants: [
      { color: 'Gold', price: 450 },
      { color: 'Red', price: 350, inStock: true },
    ],
  };
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Gold'), 450);
  assert.equal(computeItemUnitPrice(product, 'full', undefined, 'Red'), 350);
});

test('order totals surface the out-of-stock rejection for a multi-item cart', () => {
  const items = [{ productId: 'p1', purchaseType: 'full' as const, quantity: 1, color: 'Gold' }];
  const products = {
    p1: { price: 300, priceMode: 'fixed' as const, variants: [{ color: 'Gold', price: 450, inStock: false }] },
  };
  assert.throws(() => computeOrderTotals(items, products, 'pickup'));
});
