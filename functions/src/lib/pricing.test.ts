import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  computeItemUnitPrice,
  computeOrderTotals,
  computeUnitsForItem,
  getDefaultProductPriceData,
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
