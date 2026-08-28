import * as crypto from 'crypto';

/**
 * Verifies a Paystack webhook call actually came from Paystack.
 * Paystack signs the raw request body with HMAC-SHA512 using the secret key
 * and sends the result in the `x-paystack-signature` header.
 * https://paystack.com/docs/payments/webhooks/#verifying-events
 */
export function verifyPaystackSignature(
  rawBody: Buffer,
  signatureHeader: string | string[] | undefined,
  secret: string
): boolean {
  if (!signatureHeader || typeof signatureHeader !== 'string' || !secret) return false;

  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signatureHeader, 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
