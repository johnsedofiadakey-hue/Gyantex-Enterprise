import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface CartItem {
  productId: string;
  variantId?: string; // Optional if you have explicit variants
  purchaseType: 'full' | 'half';
  quantity: number; // For full piece, it's 2 half-pieces internally.
  price: number;
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Helper to send SMS via Arkesel API
 */
async function sendArkeselSMS(phone: string, message: string) {
  const ARKESEL_API_KEY = process.env.ARKESEL_API_KEY || functions.config().arkesel?.key;
  if (!ARKESEL_API_KEY) {
    console.warn('Arkesel API key not configured, skipping SMS.');
    return;
  }
  
  try {
    await axios.post('https://sms.arkesel.com/api/v2/sms/send', {
      sender: 'BLESSED',
      message: message,
      recipients: [phone]
    }, {
      headers: {
        'api-key': ARKESEL_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    console.log(`SMS sent to ${phone}`);
  } catch (error) {
    console.error('Failed to send Arkesel SMS', error);
  }
}

// ---------------------------------------------------------------------------
// ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * 1. Initialize Payment & Create Pending Order
 * This locks inventory temporarily and returns a Paystack initialization URL/reference.
 */
export const initializeCheckout = functions.https.onCall(async (data, context) => {
  const { customer, items, deliveryZone } = data;
  
  if (!items || !items.length) {
    throw new functions.https.HttpsError('invalid-argument', 'Cart is empty');
  }

  let serverCalculatedSubtotal = 0;

  // Recalculate the totalAmount server-side by fetching product prices
  for (const item of items) {
    const productSnap = await db.collection('products').doc(item.productId).get();
    if (!productSnap.exists) {
      throw new functions.https.HttpsError('not-found', `Product ${item.productId} not found`);
    }
    
    const productData = productSnap.data();
    if (!productData) continue;
    
    // Assuming productData.price is the price for a FULL piece. 
    // Half piece is half the price.
    let itemPrice = productData.price || 0;
    if (item.purchaseType === 'half') {
      itemPrice = itemPrice / 2;
    }
    
    serverCalculatedSubtotal += (itemPrice * item.quantity);
  }

  // Calculate delivery
  let deliveryFee = 0;
  if (deliveryZone === 'accra_central') deliveryFee = 30;
  if (deliveryZone === 'outside_accra') deliveryFee = 50;
  if (deliveryZone === 'pickup') deliveryFee = 0;

  const secureTotalAmount = serverCalculatedSubtotal + deliveryFee;

  // A. Create Pending Order
  const orderRef = db.collection('orders').doc();
  const orderId = orderRef.id;

  const orderData = {
    orderId,
    customer,
    items,
    deliveryZone,
    deliveryFee,
    subtotal: serverCalculatedSubtotal,
    totalAmount: secureTotalAmount,
    status: 'pending_payment',
    fulfillmentStatus: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await orderRef.set(orderData);

  // B. Reserve Inventory (Skipped atomic locking for scaffolding brevity)
  
  // C. Initialize Paystack Transaction
  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || functions.config().paystack?.secret;
  
  if (!PAYSTACK_SECRET) {
    // If no secret, return a dummy reference for testing
    return {
      reference: `mock_ref_${orderId}`,
      authorization_url: 'https://checkout.paystack.com/mock',
      orderId,
      totalAmount: secureTotalAmount
    };
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: customer.email || 'guest@blessedclothing.com',
        amount: Math.round(secureTotalAmount * 100), // Paystack uses pesewas/kobo
        reference: orderId, 
        metadata: {
          custom_fields: [
            { display_name: "Customer Name", variable_name: "name", value: `${customer.firstName} ${customer.lastName}` },
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
      totalAmount: secureTotalAmount
    };
  } catch (error) {
    console.error("Paystack Init Error", error);
    throw new functions.https.HttpsError('internal', 'Failed to initialize payment gateway');
  }
});


/**
 * 2. Paystack Webhook
 * Receives webhook from Paystack to confirm payment success.
 */
export const paystackWebhook = functions.https.onRequest(async (req, res) => {
  // NOTE: In production, verify the x-paystack-signature header using crypto.createHmac!
  
  const event = req.body;
  if (event.event === 'charge.success') {
    const reference = event.data.reference; // This is our Order ID
    const orderRef = db.collection('orders').doc(reference);
    
    try {
      await db.runTransaction(async (t) => {
        const doc = await t.get(orderRef);
        if (!doc.exists) throw new Error("Order not found");
        
        const orderData = doc.data();
        if (orderData?.status === 'paid') return; // already processed

        // 1. Mark order as paid
        t.update(orderRef, { status: 'paid' });

        // 2. Permanently deduct inventory
        for (const item of orderData?.items || []) {
          // Calculate units (1 full piece = 2 units)
          const unitsToDeduct = item.purchaseType === 'full' ? item.quantity * 2 : item.quantity;
          
          const productRef = db.collection('products').doc(item.productId);
          // Standard decrement. 
          t.update(productRef, {
            stockUnits: admin.firestore.FieldValue.increment(-unitsToDeduct)
          });
        }
      });
      
      // 3. Trigger SMS for successful order
      const orderDoc = await orderRef.get();
      const finalOrder = orderDoc.data();
      if (finalOrder && finalOrder.customer?.phone) {
        await sendArkeselSMS(
          finalOrder.customer.phone,
          `Hi ${finalOrder.customer.firstName}, your payment for order ${reference} is confirmed! We'll notify you when it ships. - Blessed Clothing`
        );
      }
      
      res.status(200).send('Success');
    } catch (err) {
      console.error("Webhook processing error", err);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.status(200).send('Ignored');
  }
});
