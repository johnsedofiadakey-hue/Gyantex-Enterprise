/**
 * One-time (safe to re-run) bootstrap: writes the storefront's built-in demo
 * products and categories into Firestore as real documents, so they show up
 * in Admin → Products / Admin → Categories and can actually be edited or
 * deleted there.
 *
 * Until this runs, the storefront shows DEFAULT_PRODUCTS/DEFAULT_CATEGORIES
 * (src/lib/catalog.ts) purely as a code-level fallback for an empty
 * Firestore collection — nothing an admin does in the dashboard touches
 * that fallback, which is why editing or deleting one there does nothing.
 *
 * Uses `set(..., { merge: true })` with the SAME ids as the fallback data,
 * so it never duplicates existing docs.
 *
 * CAUTION — not safe to blindly re-run once the admin has started editing:
 * `set(..., {merge:true})` on a doc id that was since DELETED recreates it
 * from scratch, since Firestore can't tell "deleted" from "never existed".
 * If the owner has already deleted or renamed any of these, re-running this
 * whole script silently undoes that. Re-run it only for a genuinely fresh
 * project, or hand-seed just the new/missing collection instead (see git
 * history for an example of seeding a single new collection safely).
 *
 * Usage: node scripts/seedDefaults.js
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'gyantexenterpr1se' });
const db = admin.firestore();

const CATEGORIES = [
  { id: 'default-funeral-cloth', name: 'Funeral Cloth', order: 0 },
  { id: 'default-church-cloth', name: 'Church Cloth', order: 1 },
  { id: 'default-school-cloth', name: 'School Cloth', order: 2 },
  { id: 'default-institutions', name: 'Institutions', order: 3 },
  { id: 'default-souvenir', name: 'Souvenir', order: 4 },
  { id: 'default-ready-catalog', name: 'Ready Catalog', order: 5 },
];

const DELIVERY_ZONES = [
  { id: 'pickup', label: 'Pickup at Kejetia', description: 'Kumasi inside Kejetia Gate 11, Shop No. F-1472', fee: 0, order: 0, active: true },
  { id: 'kumasi_delivery', label: 'Kumasi delivery', description: 'Delivery fee is confirmed with your location.', fee: 30, order: 1, active: true },
  { id: 'ghana_delivery', label: 'Delivery outside Kumasi', description: 'Nationwide delivery is arranged after order confirmation.', fee: 50, order: 2, active: true },
];

const PRODUCTS = [
  {
    id: 'funeral-memorial-cloth',
    name: 'Funeral Memorial Cloth Design & Print',
    price: 150,
    priceMode: 'fixed',
    startingPriceLabel: 'Price not set yet',
    unit: 'project',
    imageUrl: '/images/gyantex-market-wax-print-rolls.jpg',
    gallery: ['/images/gyantex-market-wax-print-rolls.jpg', '/images/gyantex-market-wax-print-stall.jpg'],
    colors: ['#9c2b1f', '#1a1a1a'],
    colorNames: ['Red', 'Black & White'],
    colorOptions: [
      { name: 'Red', hex: '#9c2b1f' },
      { name: 'Black & White', hex: '#1a1a1a' },
    ],
    badge: 'Most requested',
    featured: true,
    category: 'Funeral Cloth',
    description: 'Custom memorial textile design and printing for funeral families, associations, and funeral committees.',
    tags: ['funeral', 'memorial', 'cloth', 'portrait', 'family', 'custom print'],
    turnaround: 'Confirmed during quote',
    minimumOrder: 'Depends on design and fabric choice',
    trackInventory: false,
  },
  {
    id: 'church-anniversary-cloth',
    name: 'Church Program & Anniversary Cloth',
    price: 180,
    priceMode: 'fixed',
    startingPriceLabel: 'Price not set yet',
    unit: 'project',
    imageUrl: '/images/gyantex-market-wax-print-stall.jpg',
    gallery: ['/images/gyantex-market-wax-print-stall.jpg', '/images/gyantex-market-wax-print-rolls.jpg'],
    colors: ['#101010', '#ffffff', '#254c78', '#d5a843'],
    colorNames: ['Black', 'White', 'Royal Blue', 'Gold'],
    colorOptions: [
      { name: 'Black', hex: '#101010', image: '/images/gyantex-market-wax-print-stall.jpg' },
      { name: 'White', hex: '#ffffff', image: '/images/gyantex-market-wax-print-rolls.jpg' },
      { name: 'Royal Blue', hex: '#254c78' },
      { name: 'Gold', hex: '#d5a843' },
    ],
    badge: 'For groups',
    featured: true,
    category: 'Church Cloth',
    description: 'Custom printed cloth for church anniversaries, conventions, harvests, choir groups, and ministry programs.',
    tags: ['church', 'anniversary', 'choir', 'harvest', 'convention', 'custom cloth'],
    turnaround: 'Confirmed during quote',
    minimumOrder: 'Depends on quantity and fabric choice',
    trackInventory: false,
  },
  {
    id: 'school-custom-cloth',
    name: 'School & Alumni Custom Cloth',
    price: 90,
    priceMode: 'fixed',
    startingPriceLabel: 'Price not set yet',
    unit: 'piece',
    imageUrl: '/images/gyantex-market-wax-print-rolls.jpg',
    gallery: ['/images/gyantex-market-wax-print-rolls.jpg', '/images/gyantex-market-wax-print-stall.jpg'],
    colors: ['#0d0d0d', '#f7f7f2', '#1f4d3a', '#7b1e2b'],
    colorNames: ['Black', 'White', 'Green', 'Burgundy'],
    badge: 'School events',
    category: 'School Cloth',
    description: 'Designed textile cloth for schools, alumni groups, graduations, durbars, reunions, and institutional events.',
    tags: ['school', 'alumni', 'graduation', 'uniform', 'institution', 'custom print'],
    turnaround: 'Confirmed during quote',
    minimumOrder: 'Depends on quantity and fabric choice',
    trackInventory: false,
  },
  {
    id: 'institutional-branded-textile',
    name: 'Institutional Branded Textile',
    price: 200,
    priceMode: 'fixed',
    startingPriceLabel: 'Price not set yet',
    unit: 'project',
    imageUrl: '/images/gyantex-market-wax-print-stall.jpg',
    gallery: ['/images/gyantex-market-wax-print-stall.jpg', '/images/gyantex-market-wax-print-rolls.jpg'],
    colors: ['#111111', '#f5f5f0', '#253858', '#8d6f2f'],
    colorNames: ['Black', 'Ivory', 'Navy', 'Bronze'],
    badge: 'Custom design',
    category: 'Institutions',
    description: 'Custom textile designs for institutions, associations, businesses, local groups, and formal programs.',
    tags: ['institution', 'association', 'business', 'logo', 'branded cloth', 'custom textile'],
    turnaround: 'Confirmed during quote',
    minimumOrder: 'Depends on quantity and fabric choice',
    trackInventory: false,
  },
  {
    id: 'event-souvenir-cloth',
    name: 'Event Souvenir Cloth',
    price: 60,
    priceMode: 'fixed',
    startingPriceLabel: 'Price not set yet',
    unit: 'piece',
    imageUrl: '/images/gyantex-market-wax-print-rolls.jpg',
    gallery: ['/images/gyantex-market-wax-print-rolls.jpg', '/images/gyantex-market-wax-print-stall.jpg'],
    colors: ['#111111', '#ffffff', '#525252', '#7f1d1d'],
    colorNames: ['Black', 'White', 'Slate', 'Deep Red'],
    badge: 'Events',
    category: 'Souvenir',
    description: 'Printed cloth for personal celebrations, branded souvenirs, community events, and special occasions.',
    tags: ['event', 'souvenir', 'celebration', 'custom cloth', 'textile print'],
    turnaround: 'Confirmed during quote',
    minimumOrder: 'Depends on quantity and fabric choice',
    trackInventory: false,
  },
  {
    id: 'ready-catalog-selection',
    name: 'Ready Catalog Design Selection',
    price: 0,
    priceMode: 'quote',
    startingPriceLabel: 'Ask for current catalog',
    unit: 'selection',
    imageUrl: '/images/gyantex-market-wax-print-stall.jpg',
    gallery: ['/images/gyantex-market-wax-print-stall.jpg', '/images/gyantex-market-wax-print-rolls.jpg'],
    colors: ['#111111', '#ffffff', '#5b2f8f', '#d43f3a'],
    colorNames: ['Black', 'White', 'Purple', 'Red'],
    badge: 'WhatsApp catalog',
    category: 'Ready Catalog',
    description: 'Browse current Gyantex catalog samples and request a similar pattern or a fresh custom variation.',
    tags: ['catalog', 'samples', 'ready design', 'whatsapp catalog', 'textile'],
    turnaround: 'Confirmed during quote',
    minimumOrder: 'Depends on selected fabric and print method',
    trackInventory: false,
  },
];

async function main() {
  const batch = db.batch();

  for (const category of CATEGORIES) {
    const { id, ...data } = category;
    batch.set(db.collection('categories').doc(id), { ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  for (const product of PRODUCTS) {
    const { id, ...data } = product;
    batch.set(
      db.collection('products').doc(id),
      { ...data, reservedUnits: 0, createdAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }

  for (const zone of DELIVERY_ZONES) {
    const { id, ...data } = zone;
    batch.set(db.collection('deliveryZones').doc(id), { ...data, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${CATEGORIES.length} categories, ${PRODUCTS.length} products, and ${DELIVERY_ZONES.length} delivery zones into Firestore.`);
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
