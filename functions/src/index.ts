import * as functions from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import {
  computeUnitsForItem,
  computeOrderTotals,
  getDefaultProductPriceData,
  shouldTrackInventory,
  DELIVERY_FEES,
  ProductPriceData,
  CartItemInput,
} from './lib/pricing';
import { verifyPaystackSignature } from './lib/paystack';
import { normalizeGhanaPhone } from './lib/phone';

admin.initializeApp();
const db = admin.firestore();

// How long a "pending payment" order holds its stock reservation before it's
// automatically released back to available inventory.
const RESERVATION_TTL_MINUTES = 20;

// Public site URL, used to link back to the storefront from SMS/email —
// e.g. https://gyantexenterpr1se.web.app. Omit the trailing slash. Falls back to
// leaving the tracking mention out of messages if unset.
const SITE_URL = (process.env.SITE_URL || functions.config().app?.site_url || '').replace(/\/$/, '');

// Where the "you have a new order" SMS goes — Gyantex's own line by default.
// Override with ADMIN_NOTIFY_PHONE if orders should alert a different number.
const ADMIN_NOTIFY_PHONE = process.env.ADMIN_NOTIFY_PHONE || functions.config().app?.admin_phone || '233246860173';

interface CustomerInput {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  marketingOptIn?: boolean;
}

interface DeliveryDetailsInput {
  zone?: string;
  label?: string;
  address?: string;
  notes?: string;
  pickupAddress?: string;
}

interface ProjectDetailsInput {
  organization?: string;
  neededBy?: string;
  brief?: string;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Helper to send SMS via mNotify's Quick SMS API.
 */
async function sendSMS(phone: string, message: string) {
  const MNOTIFY_API_KEY = process.env.MNOTIFY_API_KEY || functions.config().mnotify?.key;
  if (!MNOTIFY_API_KEY) {
    console.warn('mNotify API key not configured, skipping SMS.');
    return;
  }

  // Stays overridable in case this sender ID is not what mNotify/the network
  // approves.
  const senderId = process.env.MNOTIFY_SENDER_ID || functions.config().mnotify?.sender_id || 'GYANTEX';
  if (senderId.length > 11) {
    console.warn(`MNOTIFY_SENDER_ID "${senderId}" is longer than the 11-character limit Ghanaian networks allow — this send will likely be rejected.`);
  }

  const recipient = normalizeGhanaPhone(phone);

  try {
    const response = await axios.post(
      `https://api.mnotify.com/api/sms/quick?key=${encodeURIComponent(MNOTIFY_API_KEY)}`,
      {
        recipient: [recipient],
        sender: senderId,
        message,
        is_schedule: false,
        schedule_date: '',
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    if (response.data?.code && String(response.data.code) !== '2000') {
      console.error('mNotify SMS send returned a non-success code', response.data);
      return;
    }
    console.log(`SMS sent to ${recipient}`);
  } catch (error) {
    console.error('Failed to send mNotify SMS', error);
  }
}

/**
 * Mints a short, human-friendly order number like "GYX-1042" by atomically
 * incrementing a shared counter — distinct from the Firestore document id,
 * which is what's actually used to look the order back up.
 */
async function generateOrderNumber(): Promise<string> {
  const counterRef = db.collection('counters').doc('orders');
  const next = await db.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const current = (snap.exists ? snap.data()!.value : 1000) as number;
    const value = current + 1;
    t.set(counterRef, { value }, { merge: true });
    return value;
  });
  return `GYX-${next}`;
}

/**
 * Live delivery fees from Admin → Delivery (Firestore `deliveryZones`),
 * falling back to pricing.ts's hardcoded DELIVERY_FEES when that collection
 * is empty — same fallback pattern as products/categories.
 *
 * Cached in-memory per warm function instance for DELIVERY_FEE_CACHE_MS: a
 * busy run of back-to-back checkouts (or a POS register on a good day)
 * shouldn't re-read this tiny, rarely-changing collection on every single
 * one. An admin's delivery fee edit takes up to that long to reach checkout
 * — worth it for the read savings, not worth it as a correctness risk (this
 * isn't stock or price data, just a small delivery surcharge).
 */
const DELIVERY_FEE_CACHE_MS = 60_000;
let deliveryFeeCache: { map: Record<string, number>; fetchedAt: number } | null = null;

async function getDeliveryFeeMap(): Promise<Record<string, number>> {
  if (deliveryFeeCache && Date.now() - deliveryFeeCache.fetchedAt < DELIVERY_FEE_CACHE_MS) {
    return deliveryFeeCache.map;
  }
  const snap = await db.collection('deliveryZones').get();
  const map: Record<string, number> = {};
  if (snap.empty) {
    Object.assign(map, DELIVERY_FEES);
  } else {
    snap.forEach((doc) => {
      const fee = doc.data().fee;
      if (typeof fee === 'number') map[doc.id] = fee;
    });
  }
  deliveryFeeCache = { map, fetchedAt: Date.now() };
  return map;
}

/** The one-tap link sent by SMS/email so a customer can check status without re-entering anything. */
// Query param is "t", not "token" — mNotify's fraud filter blocks any SMS
// containing a link with a literal "token=" parameter (confirmed by testing
// directly against their API: the identical link with the param renamed to
// "t=" sends fine). Keep this short param name in both places below.
function buildTrackingUrl(orderId: string, token: string): string {
  return SITE_URL ? `${SITE_URL}/track-order?orderId=${orderId}&t=${token}` : '';
}

let cachedTransporter: nodemailer.Transporter | null = null;
function getEmailTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST || functions.config().smtp?.host;
  const user = process.env.SMTP_USER || functions.config().smtp?.user;
  const pass = process.env.SMTP_PASS || functions.config().smtp?.pass;
  const port = Number(process.env.SMTP_PORT || functions.config().smtp?.port || 587);
  if (!host || !user || !pass) return null;

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return cachedTransporter;
}

/** Sends an order confirmation email. Silently skips if SMTP isn't configured. */
async function sendOrderConfirmationEmail(order: admin.firestore.DocumentData, reference: string) {
  const transporter = getEmailTransporter();
  if (!transporter || !order.customer?.email) return;

  const items = (order.items || []) as Array<{ name: string; quantity: number; color?: string; purchaseType: 'full' | 'half'; price: number; priceMode?: 'fixed' | 'quote' }>;
  const itemsList = items
    .map((i) => {
      const price = i.price <= 0 ? 'Price not set yet' : `GHS ${(i.price * i.quantity).toFixed(2)}`;
      return `- ${i.quantity}x ${i.name}${i.color ? ` (${i.color}, ${i.purchaseType === 'full' ? 'Full Piece' : 'Half Piece'})` : ''} — ${price}`;
    })
    .join('\n');
  const deliverySummary = order.deliveryDetails?.label || order.deliveryZone || 'To be confirmed';
  const briefSummary = order.projectDetails?.brief ? `\nBrief: ${order.projectDetails.brief}\n` : '';

  const orderLabel = order.orderNumber || reference;
  const trackingUrl = order.confirmToken ? buildTrackingUrl(reference, order.confirmToken) : '';

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || functions.config().smtp?.from || '"Gyantex Enterprise" <orders@gyantexenterprise.com>',
      to: order.customer.email,
      subject: `Order Confirmed — ${orderLabel}`,
      text: `Hi ${order.customer.firstName},\n\nYour payment is confirmed and your order is being prepared.\n\n${itemsList}\n${briefSummary}\nDelivery: ${deliverySummary}\nDelivery fee: GHS ${(order.deliveryFee ?? 0).toFixed(2)}\nTotal: GHS ${order.totalAmount.toFixed(2)}\n\nOrder number: ${orderLabel}\n${trackingUrl ? `Track your order: ${trackingUrl}\n` : ''}\nThank you for choosing Gyantex Enterprise.`,
    });
  } catch (error) {
    console.error('Failed to send confirmation email', error);
  }
}

/**
 * Finalizes a paid order: marks it paid, permanently deducts the stock that
 * was reserved at checkout, and sends the confirmation SMS/email + admin
 * alert — but only the first time. If the order is already 'paid' (e.g. the
 * webhook fires twice, or the webhook and the confirmation-page verification
 * below both resolve it), this is a no-op that skips re-sending
 * notifications — Paystack retries webhook deliveries, so without this guard
 * a customer could get the same confirmation SMS more than once.
 * Returns null if the order doesn't exist at all.
 */
async function finalizeOrderPayment(reference: string): Promise<{ order: FirebaseFirestore.DocumentData; justPaid: boolean } | null> {
  const orderRef = db.collection('orders').doc(reference);

  const result = await db.runTransaction(async (t) => {
    const doc = await t.get(orderRef);
    if (!doc.exists) return null;

    const orderData = doc.data()!;
    if (orderData.status === 'paid') {
      return { order: orderData, justPaid: false };
    }

    const items: CartItemInput[] = orderData.items || [];
    const productRefs = items.map((item) => db.collection('products').doc(item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => t.get(ref)));

    // 1. Mark order as paid and move fulfillment straight to "processing" —
    // payment confirmation is what starts the work, so there's no reason for
    // the tracker to sit on "Received" until a staff member manually bumps
    // it later.
    t.update(orderRef, {
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      fulfillmentStatus: 'processing',
    });

    // 2. Finalize inventory: permanently deduct stock, release the matching reservation.
    productSnaps.forEach((snap, i) => {
      if (!snap.exists) return;
      const productData = snap.data() as ProductPriceData;
      if (!shouldTrackInventory(productData)) return;
      const unitsToDeduct = computeUnitsForItem(items[i]);
      t.update(snap.ref, {
        stockUnits: admin.firestore.FieldValue.increment(-unitsToDeduct),
        reservedUnits: admin.firestore.FieldValue.increment(-unitsToDeduct),
      });
    });

    return { order: { ...orderData, status: 'paid', fulfillmentStatus: 'processing' }, justPaid: true };
  });

  if (result?.justPaid) {
    const finalOrder = result.order;
    const orderLabel = finalOrder.orderNumber || reference;
    const itemCount = (finalOrder.items || []).reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0);

    if (finalOrder.customer?.phone) {
      const trackingUrl = finalOrder.confirmToken ? buildTrackingUrl(reference, finalOrder.confirmToken) : '';
      await sendSMS(
        finalOrder.customer.phone,
        `Hi ${finalOrder.customer.firstName}, your order ${orderLabel} (${itemCount} item${itemCount === 1 ? '' : 's'}, GHS ${(finalOrder.totalAmount || 0).toFixed(2)}) is confirmed and being processed.` +
        (trackingUrl ? ` Track it: ${trackingUrl}` : '') +
        ` - Gyantex Enterprise`
      );
    }
    await sendOrderConfirmationEmail(finalOrder, reference);

    // Notify Gyantex — a paid order needs fabric, printing, and delivery arranged.
    await sendSMS(
      ADMIN_NOTIFY_PHONE,
      `New paid order ${orderLabel}: ${itemCount} item${itemCount === 1 ? '' : 's'} from ${finalOrder.customer?.firstName || 'a customer'}, ` +
      `GHS ${(finalOrder.totalAmount || 0).toFixed(2)}. Check the admin panel to prepare it.`
    );
  }

  return result;
}

/**
 * Asks Paystack directly whether a transaction actually succeeded — the
 * authoritative source, independent of whether their webhook ever reached
 * us. Used as a fallback when a customer lands on the confirmation page
 * before (or without) the webhook arriving, so a real payment doesn't stay
 * stuck showing "processing" just because the webhook was delayed, never
 * configured, or dropped. Returns 'other' (treated as "keep waiting") if
 * Paystack isn't configured or the call itself fails — never guesses success.
 */
async function verifyPaystackTransaction(reference: string): Promise<'success' | 'failed' | 'other'> {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || functions.config().paystack?.secret;
  if (!PAYSTACK_SECRET) return 'other';

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );
    const status = response.data?.data?.status;
    if (status === 'success') return 'success';
    if (status === 'failed' || status === 'abandoned') return 'failed';
    return 'other';
  } catch (error) {
    console.error('Paystack verify error', error);
    return 'other';
  }
}

/**
 * Releases a pending order's stock reservation (e.g. payment failed or expired)
 * and marks the order accordingly. No-ops if the order was already resolved
 * (paid, or already released) — safe to call more than once.
 */
async function releaseReservation(orderId: string, newStatus: 'expired' | 'failed') {
  const orderRef = db.collection('orders').doc(orderId);
  await db.runTransaction(async (t) => {
    const orderSnap = await t.get(orderRef);
    if (!orderSnap.exists) return;
    const order = orderSnap.data()!;
    if (order.status !== 'pending_payment') return;

    const items: CartItemInput[] = order.items || [];
    const productRefs = items.map((item) => db.collection('products').doc(item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => t.get(ref)));

    productSnaps.forEach((snap, i) => {
      if (!snap.exists) return;
      const productData = snap.data() as ProductPriceData;
      if (!shouldTrackInventory(productData)) return;
      const units = computeUnitsForItem(items[i]);
      t.update(snap.ref, { reservedUnits: admin.firestore.FieldValue.increment(-units) });
    });

    t.update(orderRef, { status: newStatus });
  });
}

// ---------------------------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * 1. Initialize Payment & Reserve Inventory
 * Atomically checks stock, holds a reservation against it, creates a pending
 * order, and returns a Paystack initialization URL/reference.
 */
export const initializeCheckout = functions.https.onCall(async (data) => {
  const { customer, items, deliveryZone, deliveryDetails, projectDetails, origin } = data as {
    customer: CustomerInput;
    items: CartItemInput[];
    deliveryZone: string;
    deliveryDetails?: DeliveryDetailsInput;
    projectDetails?: ProjectDetailsInput;
    origin?: string;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Cart is empty');
  }
  if (!customer?.firstName || !customer?.phone) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing customer details');
  }

  const orderRef = db.collection('orders').doc();
  const orderId = orderRef.id;
  const confirmToken = crypto.randomBytes(18).toString('hex');
  const orderNumber = await generateOrderNumber();
  const deliveryFeeMap = await getDeliveryFeeMap();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

  const productsById: Record<string, ProductPriceData> = {};

  try {
    await db.runTransaction(async (t) => {
      // 1. Reads first — Firestore transactions require every get() before any write.
      const productRefs = items.map((item) => db.collection('products').doc(item.productId));
      const productSnaps = await Promise.all(productRefs.map((ref) => t.get(ref)));

      // 2. Validate stock is actually available for fixed, inventory-tracked
      // products. Built-in Gyantex quote services do not reserve inventory.
      productSnaps.forEach((snap, i) => {
        const fallbackProduct = getDefaultProductPriceData(items[i].productId);
        if (!snap.exists && !fallbackProduct) {
          throw new functions.https.HttpsError('not-found', `Product ${items[i].productId} not found`);
        }
        const productData = snap.exists ? snap.data() as ProductPriceData : fallbackProduct!;
        productsById[items[i].productId] = productData;

        if (!shouldTrackInventory(productData)) return;

        const unitsNeeded = computeUnitsForItem(items[i]);
        const available = (productData.stockUnits || 0) - (productData.reservedUnits || 0);
        if (available < unitsNeeded) {
          throw new functions.https.HttpsError(
            'resource-exhausted',
            `"${productData.name || 'An item'}" in your cart no longer has enough stock available. Please adjust the quantity.`
          );
        }
      });

      // 3. Writes — hold the reservation and create the pending order together.
      productSnaps.forEach((snap, i) => {
        if (!snap.exists) return;
        const productData = productsById[items[i].productId];
        if (!shouldTrackInventory(productData)) return;
        const unitsNeeded = computeUnitsForItem(items[i]);
        t.update(snap.ref, { reservedUnits: admin.firestore.FieldValue.increment(unitsNeeded) });
      });

      const { subtotal, deliveryFee, total, hasQuoteItems } = computeOrderTotals(items, productsById, deliveryZone, deliveryFeeMap);
      if (hasQuoteItems || total <= 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'One or more items in your cart don\'t have a price set yet.'
        );
      }

      t.set(orderRef, {
        orderId,
        orderNumber,
        customer,
        items,
        deliveryZone,
        deliveryDetails: deliveryDetails || null,
        projectDetails: projectDetails || null,
        deliveryFee,
        subtotal,
        totalAmount: total,
        status: 'pending_payment',
        fulfillmentStatus: 'pending',
        channel: 'paystack',
        confirmToken,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
      });
    });
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error('Checkout reservation failed', err);
    throw new functions.https.HttpsError('internal', 'Could not reserve your items. Please try again.');
  }

  const { total: secureTotalAmount } = computeOrderTotals(items, productsById, deliveryZone, deliveryFeeMap);
  const callbackUrl = origin ? `${origin}/order-confirmation?reference=${orderId}&t=${confirmToken}` : undefined;

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || functions.config().paystack?.secret;

  if (!PAYSTACK_SECRET) {
    // No live key configured — return a mock URL so the flow is testable end-to-end in dev.
    return {
      reference: orderId,
      authorization_url: callbackUrl || `https://checkout.paystack.com/mock?reference=${orderId}`,
      orderId,
      totalAmount: secureTotalAmount,
      mock: true,
    };
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: customer.email || 'guest@gyantexenterprise.com',
        amount: Math.round(secureTotalAmount * 100), // Paystack uses pesewas/kobo
        reference: orderId,
        callback_url: callbackUrl,
        metadata: {
          custom_fields: [
            { display_name: "Customer Name", variable_name: "name", value: `${customer.firstName} ${customer.lastName || ''}`.trim() },
            { display_name: "Phone", variable_name: "phone", value: customer.phone }
          ]
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      reference: orderId,
      authorization_url: response.data.data.authorization_url,
      orderId,
      totalAmount: secureTotalAmount,
    };
  } catch (error) {
    // Paystack init failed — release the stock we reserved so it doesn't get stuck.
    await releaseReservation(orderId, 'failed');
    console.error("Paystack Init Error", error);
    throw new functions.https.HttpsError('internal', 'Failed to initialize payment gateway');
  }
});

/**
 * 2. Paystack Webhook
 * Confirms payment. Verifies the request genuinely came from Paystack before
 * trusting it, then finalizes the stock reservation into a permanent deduction.
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || functions.config().paystack?.secret;

  if (PAYSTACK_SECRET) {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = (req as unknown as { rawBody: Buffer }).rawBody;
    if (!verifyPaystackSignature(rawBody, signature, PAYSTACK_SECRET)) {
      console.warn('Rejected Paystack webhook: signature did not match.');
      res.status(401).send('Invalid signature');
      return;
    }
  } else {
    console.warn('PAYSTACK_SECRET_KEY not configured — webhook signature verification is skipped (dev mode only).');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference; // This is our Order ID
    try {
      const result = await finalizeOrderPayment(reference);
      if (!result) {
        console.warn('Webhook charge.success for unknown order', reference);
      }
      res.status(200).send('Success');
    } catch (err) {
      console.error("Webhook processing error", err);
      res.status(500).send('Internal Server Error');
    }
  } else if (event.event === 'charge.failed') {
    const reference = event.data?.reference;
    if (reference) {
      try {
        await releaseReservation(reference, 'failed');
      } catch (err) {
        console.error('Failed to release reservation after charge.failed', err);
      }
    }
    res.status(200).send('Acknowledged');
  } else {
    res.status(200).send('Ignored');
  }
});

/**
 * 3. Release expired reservations
 * Runs periodically to free stock held by carts that were never paid for
 * (abandoned checkout, failed redirect, etc.) so it doesn't stay locked forever.
 */
export const releaseExpiredReservations = functions.pubsub.schedule('every 10 minutes').onRun(async () => {
  const now = admin.firestore.Timestamp.now();
  const snap = await db.collection('orders')
    .where('status', '==', 'pending_payment')
    .where('expiresAt', '<=', now)
    .get();

  for (const doc of snap.docs) {
    await releaseReservation(doc.id, 'expired');
  }

  console.log(`Released ${snap.size} expired reservation(s).`);
  return null;
});

/**
 * 4. Get Order Status
 * Lets the order-confirmation page look up an order without exposing the
 * admin-only orders collection — the caller must hold the confirmation
 * token that was minted for that specific order at checkout time.
 */
export const getOrderStatus = functions.https.onCall(async (data) => {
  const { orderId, token } = data as { orderId?: string; token?: string };
  if (!orderId || !token) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing order reference or confirmation token');
  }

  const snap = await db.collection('orders').doc(orderId).get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Order not found');
  }

  let order = snap.data()!;
  if (order.confirmToken !== token) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid confirmation link');
  }

  // The webhook is the primary way an order gets marked paid, but it can be
  // delayed, not yet registered in the Paystack dashboard, or dropped — so
  // while the customer is sitting on the confirmation page waiting, ask
  // Paystack directly rather than leaving them stuck on "processing" for a
  // payment that actually went through. This never trusts the client's own
  // claim of success — only Paystack's authenticated API response decides.
  if (order.status === 'pending_payment') {
    const verified = await verifyPaystackTransaction(orderId);
    if (verified === 'success') {
      const result = await finalizeOrderPayment(orderId);
      if (result) order = result.order;
    } else if (verified === 'failed') {
      await releaseReservation(orderId, 'failed');
      const refreshed = await db.collection('orders').doc(orderId).get();
      order = refreshed.data()!;
    }
  }

  return {
    orderId,
    orderNumber: order.orderNumber || null,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    totalAmount: order.totalAmount,
    deliveryFee: order.deliveryFee,
    deliveryZone: order.deliveryZone,
    deliveryDetails: order.deliveryDetails || null,
    projectDetails: order.projectDetails || null,
    items: order.items,
    customerFirstName: order.customer?.firstName || '',
    createdAt: order.createdAt?.toMillis?.() ?? null,
  };
});

/**
 * 5. Track Order
 * Lets a customer look up an order any time after checkout — not just via
 * the one-time confirmation link — by proving they know both the order
 * reference and the phone number it was placed under.
 */
export const trackOrder = functions.https.onCall(async (data) => {
  const { orderNumber, phone } = data as { orderNumber?: string; phone?: string };
  if (!orderNumber?.trim() || !phone?.trim()) {
    throw new functions.https.HttpsError('invalid-argument', 'Enter your order number and phone number.');
  }

  const query = await db
    .collection('orders')
    .where('orderNumber', '==', orderNumber.trim().toUpperCase())
    .limit(1)
    .get();
  if (query.empty) {
    throw new functions.https.HttpsError('not-found', "We couldn't find an order with that number.");
  }

  const snap = query.docs[0];
  const order = snap.data();

  // Order numbers are short sequential codes (GYX-1042, GYX-1043, ...) —
  // trivially guessable/enumerable. Without this check, anyone could pull
  // any customer's name and delivery address just by trying numbers in
  // sequence. Same generic "not found" error either way, so a wrong phone
  // guess can't be used to confirm an order number is valid.
  if (normalizeGhanaPhone(phone) !== normalizeGhanaPhone(order.customer?.phone || '')) {
    throw new functions.https.HttpsError('not-found', "We couldn't find an order with that number.");
  }

  return {
    orderId: snap.id,
    orderNumber: order.orderNumber || null,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    totalAmount: order.totalAmount,
    deliveryFee: order.deliveryFee,
    deliveryZone: order.deliveryZone,
    deliveryDetails: order.deliveryDetails || null,
    projectDetails: order.projectDetails || null,
    items: order.items,
    customerFirstName: order.customer?.firstName || '',
    createdAt: order.createdAt?.toMillis?.() ?? null,
    channel: order.channel,
  };
});

// ---------------------------------------------------------------------------
// STAFF MANAGEMENT (owner-only)
// ---------------------------------------------------------------------------

function assertOwner(context: functions.https.CallableContext) {
  const claims = context.auth?.token;
  if (!claims || !(claims.role === 'owner' || claims.admin === true)) {
    throw new functions.https.HttpsError('permission-denied', 'Owner access required.');
  }
}

function assertStaff(context: functions.https.CallableContext) {
  const claims = context.auth?.token;
  if (!claims || !(claims.role === 'owner' || claims.role === 'staff' || claims.admin === true)) {
    throw new functions.https.HttpsError('permission-denied', 'Staff access required.');
  }
}

interface InviteStaffInput {
  email: string;
  name: string;
  password: string;
}

function assertValidPassword(password: string) {
  if (!password || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters.');
  }
}

/**
 * 6. Invite Staff
 * Owner-only. Creates (or reuses) the Firebase Auth account with a password
 * the owner sets directly, grants it the `staff` role claim. The owner is
 * responsible for handing that password to the new hire themselves (e.g.
 * WhatsApp) — deliberately no email/reset-link step to fail silently.
 */
export const inviteStaff = functions.https.onCall(async (data: InviteStaffInput, context) => {
  assertOwner(context);

  const email = (data.email || '').trim().toLowerCase();
  const name = (data.name || '').trim();
  if (!email || !name) {
    throw new functions.https.HttpsError('invalid-argument', 'Name and email are required.');
  }
  assertValidPassword(data.password);

  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password: data.password, displayName: name, disabled: false });
  } catch {
    userRecord = await admin.auth().createUser({ email, password: data.password, displayName: name });
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'staff' });

  await db.collection('staff').doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      email,
      name,
      role: 'staff',
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth!.uid,
    },
    { merge: true }
  );

  return { uid: userRecord.uid };
});

interface SetStaffPasswordInput {
  uid: string;
  password: string;
}

/**
 * 7. Set Staff Password
 * Owner-only. Resets an existing staff (or owner) account's password
 * directly and revokes their current session, so the old password stops
 * working immediately rather than staying valid until it expires on its own.
 */
export const setStaffPassword = functions.https.onCall(async (data: SetStaffPasswordInput, context) => {
  assertOwner(context);

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid.');
  }
  assertValidPassword(data.password);

  await admin.auth().updateUser(uid, { password: data.password });
  await admin.auth().revokeRefreshTokens(uid);
  return { uid };
});

interface UpdateStaffRoleInput {
  uid: string;
  role: 'owner' | 'staff';
}

/**
 * 8. Update Staff Role
 * Owner-only. Cannot be used to change your own role, so the sole owner
 * account can never accidentally lock itself out (there's no recovery path).
 */
export const updateStaffRole = functions.https.onCall(async (data: UpdateStaffRoleInput, context) => {
  assertOwner(context);

  const { uid, role } = data;
  if (!uid || (role !== 'owner' && role !== 'staff')) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid uid/role.');
  }
  if (context.auth!.uid === uid && role !== 'owner') {
    throw new functions.https.HttpsError('failed-precondition', "You can't change your own role.");
  }

  await admin.auth().setCustomUserClaims(uid, { role });
  await db.collection('staff').doc(uid).set({ role }, { merge: true });
  return { uid, role };
});

interface SetStaffStatusInput {
  uid: string;
  status: 'active' | 'disabled';
}

/**
 * 9. Set Staff Status
 * Owner-only. Disabling also revokes refresh tokens so an already-signed-in
 * session is force-logged-out immediately, not just blocked from a fresh
 * sign-in (an existing ID token otherwise stays valid up to an hour).
 */
export const setStaffStatus = functions.https.onCall(async (data: SetStaffStatusInput, context) => {
  assertOwner(context);

  const { uid, status } = data;
  if (!uid || (status !== 'active' && status !== 'disabled')) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid uid/status.');
  }
  if (context.auth!.uid === uid) {
    throw new functions.https.HttpsError('failed-precondition', "You can't disable your own account.");
  }

  await admin.auth().updateUser(uid, { disabled: status === 'disabled' });
  if (status === 'disabled') {
    await admin.auth().revokeRefreshTokens(uid);
  }
  await db.collection('staff').doc(uid).set({ status }, { merge: true });
  return { uid, status };
});

// ---------------------------------------------------------------------------
// POS (owner + staff)
// ---------------------------------------------------------------------------

interface PosSaleInput {
  items: CartItemInput[];
  customer?: { name?: string; phone?: string };
  paymentMethod: 'cash' | 'mobile_money';
  amountTendered?: number;
  notes?: string;
}

/**
 * 10. Record POS Sale
 * Owner or staff. Rings up an in-person sale: reuses the same server-side
 * pricing/stock-validation engine as web checkout, but skips the
 * reserve-then-webhook dance and deducts stock immediately since payment is
 * already physically confirmed by the time this is called. Rejects
 * quote-priced items outright — those still go through the normal
 * quote/WhatsApp conversation, not a register sale.
 */
export const recordPosSale = functions.https.onCall(async (data: PosSaleInput, context) => {
  assertStaff(context);

  const { items, customer, paymentMethod, amountTendered, notes } = data;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Sale has no items.');
  }
  if (paymentMethod !== 'cash' && paymentMethod !== 'mobile_money') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid payment method.');
  }

  const orderRef = db.collection('orders').doc();
  const orderId = orderRef.id;
  const confirmToken = crypto.randomBytes(18).toString('hex');
  const orderNumber = await generateOrderNumber();
  const deliveryFeeMap = await getDeliveryFeeMap();
  const productsById: Record<string, ProductPriceData> = {};

  await db.runTransaction(async (t) => {
    // 1. Reads first — Firestore transactions require every get() before any write.
    const productRefs = items.map((item) => db.collection('products').doc(item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => t.get(ref)));

    productSnaps.forEach((snap, i) => {
      if (!snap.exists) {
        throw new functions.https.HttpsError('not-found', `Product ${items[i].productId} not found`);
      }
      productsById[items[i].productId] = snap.data() as ProductPriceData;
    });

    const { subtotal, hasQuoteItems } = computeOrderTotals(items, productsById, 'pickup', deliveryFeeMap);
    if (hasQuoteItems) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        "One or more items don't have a fixed price and can't be sold at the register. Use the normal quote workflow for those."
      );
    }

    // 2. Validate stock is available — this correctly accounts for stock
    // currently reserved by concurrent web checkouts too.
    productSnaps.forEach((snap, i) => {
      const productData = productsById[items[i].productId];
      if (!shouldTrackInventory(productData)) return;
      const unitsNeeded = computeUnitsForItem(items[i]);
      const available = (productData.stockUnits || 0) - (productData.reservedUnits || 0);
      if (available < unitsNeeded) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `"${productData.name || 'An item'}" doesn't have enough stock for this sale.`
        );
      }
    });

    // 3. Writes — deduct stock immediately (payment already confirmed in
    // person, no reservation step needed) and record the order as paid.
    productSnaps.forEach((snap, i) => {
      const productData = productsById[items[i].productId];
      if (!shouldTrackInventory(productData)) return;
      const unitsNeeded = computeUnitsForItem(items[i]);
      t.update(snap.ref, { stockUnits: admin.firestore.FieldValue.increment(-unitsNeeded) });
    });

    const changeDue = paymentMethod === 'cash' && typeof amountTendered === 'number' ? amountTendered - subtotal : null;

    t.set(orderRef, {
      orderId,
      orderNumber,
      customer: {
        firstName: customer?.name || 'Walk-in Customer',
        lastName: '',
        phone: customer?.phone || '',
        email: '',
      },
      items,
      deliveryZone: 'pickup',
      deliveryDetails: null,
      projectDetails: null,
      deliveryFee: 0,
      subtotal,
      totalAmount: subtotal,
      status: 'paid',
      fulfillmentStatus: 'delivered',
      channel: 'pos',
      paymentMethod,
      amountTendered: typeof amountTendered === 'number' ? amountTendered : null,
      changeDue,
      notes: notes || null,
      staffUid: context.auth!.uid,
      staffEmail: context.auth!.token.email || null,
      confirmToken,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  const { subtotal: totalAmount } = computeOrderTotals(items, productsById, 'pickup', deliveryFeeMap);
  const changeDue = paymentMethod === 'cash' && typeof amountTendered === 'number' ? amountTendered - totalAmount : null;

  // Only send a receipt if the staff member captured a phone — no email
  // field exists in the POS UI, so there's nothing to send an email receipt to.
  if (customer?.phone) {
    const trackingUrl = buildTrackingUrl(orderId, confirmToken);
    await sendSMS(
      customer.phone,
      `Hi${customer.name ? ' ' + customer.name : ''}, thanks for your purchase at Gyantex Enterprise! Order ${orderNumber}, GHS ${totalAmount.toFixed(2)}.` +
        (trackingUrl ? ` Details: ${trackingUrl}` : '') +
        ` - Gyantex Enterprise`
    );
  }

  return { orderId, orderNumber, totalAmount, changeDue };
});

// ---------------------------------------------------------------------------
// DELIVERY NOTIFICATIONS
// ---------------------------------------------------------------------------

/**
 * 11. Notify On Fulfillment Change
 * Every order gets exactly two customer SMS: one when payment is confirmed
 * (sent from finalizeOrderPayment) and one when it's actually done — this
 * fires that second one, the moment staff mark an order "delivered" in
 * Admin → Orders (works for both web/Paystack and POS orders, since it
 * watches the orders collection directly rather than a specific creation
 * path). Deliberately not wired to "processing" or any middle state — two
 * touchpoints is the whole point, not a running commentary. Wording adapts
 * to "picked up" vs "delivered" based on the order's delivery zone, but
 * it's the same one SMS either way.
 *
 * This one is a 2nd-gen (Eventarc) trigger, not v1 like the rest of this
 * file — this project's Firestore database lives in the multi-region
 * `nam5`, which v1 Firestore triggers don't support at all (a real
 * deployment failure, not a style choice). 2nd-gen triggers do support it,
 * and this project already runs one 2nd-gen function (the Next.js SSR
 * handler), so mixing generations here isn't a new pattern for it.
 */
export const notifyOnFulfillmentChange = onDocumentUpdated('orders/{orderId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  if (before.fulfillmentStatus === after.fulfillmentStatus) return;
  if (after.fulfillmentStatus !== 'delivered') return;
  if (!after.customer?.phone) return;

  const orderId = event.params.orderId;
  const orderLabel = after.orderNumber || orderId;
  const trackingUrl = after.confirmToken ? buildTrackingUrl(orderId, after.confirmToken) : '';
  const itemCount = (after.items || []).reduce((sum: number, item: { quantity?: number }) => sum + (item.quantity || 0), 0);
  const itemSummary = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
  const isPickup = after.deliveryZone === 'pickup';

  const message = isPickup
    ? `Hi ${after.customer.firstName}, your order ${orderLabel} (${itemSummary}) has been picked up. Thank you for choosing Gyantex Enterprise!` +
      (trackingUrl ? ` Details: ${trackingUrl}` : '')
    : `Hi ${after.customer.firstName}, your order ${orderLabel} (${itemSummary}) has been delivered. Thank you for choosing Gyantex Enterprise!` +
      (trackingUrl ? ` Details: ${trackingUrl}` : '');

  await sendSMS(after.customer.phone, message);
});
