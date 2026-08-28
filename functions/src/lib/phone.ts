/**
 * Normalizes a Ghanaian phone number to the 233XXXXXXXXX format most local
 * SMS gateways (Arkesel included) expect. Customers type numbers in all
 * kinds of shapes at checkout — "024 123 4567", "0241234567", "+233241234567"
 * — this collapses them to one form so delivery doesn't silently fail.
 */
export function normalizeGhanaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  if (digits.startsWith('233') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '233' + digits.slice(1);
  if (digits.length === 9) return '233' + digits;

  // Doesn't match a recognized Ghanaian shape — return the digits as-is
  // rather than guessing further; the gateway will reject it visibly.
  return digits;
}
