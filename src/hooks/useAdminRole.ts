"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export type AdminRole = "owner" | "staff" | null;

/** Resolves the signed-in user's admin role from their ID token claims.
 * `role` claim is authoritative; `admin: true` (the legacy claim) is treated
 * as "owner" so the original admin account keeps full access without a
 * forced migration. `role` stays null while checking or when signed out. */
export function useAdminRole(): { loading: boolean; user: User | null; role: AdminRole } {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }
      const tokenResult = await firebaseUser.getIdTokenResult();
      const claimedRole = tokenResult.claims.role as AdminRole | undefined;
      const resolvedRole: AdminRole =
        claimedRole === "owner" || claimedRole === "staff"
          ? claimedRole
          : tokenResult.claims.admin === true
            ? "owner"
            : null;
      setUser(firebaseUser);
      setRole(resolvedRole);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { loading, user, role };
}
