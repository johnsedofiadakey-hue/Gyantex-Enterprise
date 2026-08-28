// Cloud Functions error codes whose .message we deliberately wrote to be
// shown to the customer as-is (see functions/src/index.ts HttpsError calls).
// Anything else — internal, unavailable, deadline-exceeded, a callable that
// doesn't exist yet — is infrastructure noise a customer should never see.
const USER_FACING_CODES = new Set([
  "functions/invalid-argument",
  "functions/not-found",
  "functions/permission-denied",
  "functions/resource-exhausted",
  "functions/already-exists",
  "functions/failed-precondition",
]);

/** Extracts a safe, customer-facing message from a Firebase Callable Functions error. */
export function getCallableErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: string }).code);
    if (USER_FACING_CODES.has(code) && "message" in error) {
      const message = (error as { message?: string }).message;
      // The callable SDK sometimes appends " [404]"-style HTTP status
      // suffixes to the message — strip that, it's not for customers.
      if (message) return message.replace(/\s*\[\d{3}\]\s*$/, "");
    }
  }
  return fallback;
}
