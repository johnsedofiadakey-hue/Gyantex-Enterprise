/**
 * One-time bootstrap: grants the `role` custom claim to a Firebase Auth
 * user, so they can sign into /admin. This is deliberately a script you run
 * yourself with your own credentials — not a callable Cloud Function —
 * because a role-granting endpoint reachable over the network is a
 * privilege-escalation risk in a way a local script with your own gcloud
 * credentials is not. Staff accounts after the first owner should go
 * through the in-app "Invite Staff" flow (Admin → Staff) instead of this
 * script — this stays reserved for creating/recovering the owner account.
 *
 * Setup (once):
 *   1. In the Firebase Console, create the user under Authentication (email
 *      + password) if they don't already have an account.
 *   2. Run: gcloud auth application-default login
 *      (or set GOOGLE_APPLICATION_CREDENTIALS to a service account key)
 *
 * Usage:
 *   node scripts/grantAdmin.js someone@example.com owner
 *   node scripts/grantAdmin.js someone@example.com staff
 */

const admin = require('firebase-admin');

const email = process.argv[2];
const role = process.argv[3] || 'owner';

if (!email || (role !== 'owner' && role !== 'staff')) {
  console.error('Usage: node scripts/grantAdmin.js <email> <owner|staff>');
  process.exit(1);
}

admin.initializeApp({ projectId: 'gyantexenterpr1se' });

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  // `admin: true` is kept alongside `role` as a permanent legacy-compat
  // claim (see firestore.rules' isOwner()) — harmless to also set it on a
  // staff grant, since only `role` is what firestore.rules and the Cloud
  // Functions actually check for staff-level access.
  const claims = role === 'owner' ? { role: 'owner', admin: true } : { role: 'staff' };
  await admin.auth().setCustomUserClaims(user.uid, claims);
  console.log(`Granted "${role}" role to ${email} (uid: ${user.uid}).`);
  console.log('They must sign out and back in for the new claim to appear in their session.');
}

main().catch((err) => {
  console.error('Failed to grant admin claim:', err.message);
  process.exit(1);
});
