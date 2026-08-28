import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { normalizeGhanaPhone } from './phone';

test('local format with leading 0 becomes 233-prefixed', () => {
  assert.equal(normalizeGhanaPhone('0241234567'), '233241234567');
});

test('spaced/dashed local format is normalized the same way', () => {
  assert.equal(normalizeGhanaPhone('024 123 4567'), '233241234567');
  assert.equal(normalizeGhanaPhone('024-123-4567'), '233241234567');
});

test('already-international format (with or without +) is left as digits', () => {
  assert.equal(normalizeGhanaPhone('+233241234567'), '233241234567');
  assert.equal(normalizeGhanaPhone('233241234567'), '233241234567');
});

test('9-digit number with no leading 0 gets the country code added', () => {
  assert.equal(normalizeGhanaPhone('241234567'), '233241234567');
});

test('an unrecognized shape is returned as bare digits rather than guessed at', () => {
  assert.equal(normalizeGhanaPhone('12345'), '12345');
});
