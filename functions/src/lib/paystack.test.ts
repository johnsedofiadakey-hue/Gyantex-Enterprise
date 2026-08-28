import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as crypto from 'crypto';
import { verifyPaystackSignature } from './paystack';

const SECRET = 'sk_test_super_secret';

function sign(body: Buffer, secret: string): string {
  return crypto.createHmac('sha512', secret).update(body).digest('hex');
}

test('accepts a signature genuinely computed with the shared secret', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'abc123' } }));
  assert.equal(verifyPaystackSignature(body, sign(body, SECRET), SECRET), true);
});

test('rejects a signature computed with the wrong secret (forged webhook)', () => {
  const body = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'abc123' } }));
  assert.equal(verifyPaystackSignature(body, sign(body, 'sk_test_wrong_secret'), SECRET), false);
});

test('rejects a valid-looking signature paired with a tampered body', () => {
  const originalBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'abc123' } }));
  const signature = sign(originalBody, SECRET);
  const tamperedBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: { reference: 'someone-elses-order' } }));
  assert.equal(verifyPaystackSignature(tamperedBody, signature, SECRET), false);
});

test('rejects when the signature header is missing entirely', () => {
  const body = Buffer.from('{}');
  assert.equal(verifyPaystackSignature(body, undefined, SECRET), false);
});
