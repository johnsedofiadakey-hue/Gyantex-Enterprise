"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { KeyRound, Plus, Power, ShieldCheck, User as UserIcon, X } from "lucide-react";
import { db, functions } from "@/lib/firebase";
import { useToastStore } from "@/store/useToastStore";
import { useAdminRole } from "@/hooks/useAdminRole";
import { getCallableErrorMessage } from "@/lib/errors";

interface StaffMember {
  uid: string;
  email: string;
  name: string;
  role: "owner" | "staff";
  status: "active" | "disabled";
}

export default function AdminStaffPage() {
  const { role: myRole, user } = useAdminRole();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    const staffQuery = query(collection(db, "staff"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      staffQuery,
      (snapshot) => {
        setStaff(snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as StaffMember)));
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load staff", error);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  if (myRole === "staff") {
    return (
      <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
        This page is only available to the business owner.
      </div>
    );
  }

  const openInvite = () => {
    setEmail("");
    setName("");
    setPassword("");
    setShowForm(true);
  };

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !name.trim()) {
      toast("Name and email are required.", "error");
      return;
    }
    if (password.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }
    setSaving(true);
    try {
      const inviteStaff = httpsCallable(functions, "inviteStaff");
      await inviteStaff({ email: email.trim(), name: name.trim(), password });
      toast(`${name.trim()} added. Share their email and password with them directly.`, "success");
      setShowForm(false);
    } catch (error) {
      console.error(error);
      toast(getCallableErrorMessage(error, "Couldn't invite this person. Please try again."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = async (member: StaffMember) => {
    if (member.uid === user?.uid) {
      toast("You can't change your own role.", "error");
      return;
    }
    const nextRole = member.role === "owner" ? "staff" : "owner";
    if (!confirm(`Change ${member.name || member.email}'s role to ${nextRole}?`)) return;
    try {
      const updateStaffRole = httpsCallable(functions, "updateStaffRole");
      await updateStaffRole({ uid: member.uid, role: nextRole });
      toast("Role updated.", "success");
    } catch (error) {
      console.error(error);
      toast(getCallableErrorMessage(error, "Couldn't update this role. Please try again."), "error");
    }
  };

  const handleStatusToggle = async (member: StaffMember) => {
    if (member.uid === user?.uid) {
      toast("You can't disable your own account.", "error");
      return;
    }
    const nextStatus = member.status === "active" ? "disabled" : "active";
    if (nextStatus === "disabled" && !confirm(`Disable ${member.name || member.email}? They'll be signed out immediately.`)) return;
    try {
      const setStaffStatus = httpsCallable(functions, "setStaffStatus");
      await setStaffStatus({ uid: member.uid, status: nextStatus });
      toast(nextStatus === "disabled" ? "Account disabled." : "Account re-enabled.", "success");
    } catch (error) {
      console.error(error);
      toast(getCallableErrorMessage(error, "Couldn't update this account. Please try again."), "error");
    }
  };

  const openReset = (member: StaffMember) => {
    setResetTarget(member);
    setResetPassword("");
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    if (resetPassword.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }
    setResetting(true);
    try {
      const setStaffPassword = httpsCallable(functions, "setStaffPassword");
      await setStaffPassword({ uid: resetTarget.uid, password: resetPassword });
      toast(`Password reset for ${resetTarget.name || resetTarget.email}. They're signed out until they use the new one.`, "success");
      setResetTarget(null);
    } catch (error) {
      console.error(error);
      toast(getCallableErrorMessage(error, "Couldn't reset this password. Please try again."), "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-charcoal/60">{staff.length} staff account{staff.length === 1 ? "" : "s"}</p>
        <button
          onClick={openInvite}
          className="flex items-center gap-2 rounded-md bg-olive px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-olive/90"
        >
          <Plus size={16} /> Invite Staff
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">Loading staff...</div>
      ) : staff.length === 0 ? (
        <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
          No staff accounts yet. Invite someone to give them register + order access without full admin rights.
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-soft-grey text-left text-xs uppercase tracking-wider text-charcoal/50">
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.uid} className="border-b border-soft-grey last:border-0">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 font-medium">
                      <UserIcon size={14} className="text-charcoal/40" />
                      {member.name || "—"}
                      {member.uid === user?.uid && <span className="text-xs font-normal text-charcoal/40">(you)</span>}
                    </div>
                    <div className="text-xs text-charcoal/50">{member.email}</div>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => handleRoleToggle(member)}
                      disabled={member.uid === user?.uid}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        member.role === "owner" ? "bg-olive/10 text-olive" : "bg-charcoal/10 text-charcoal/70"
                      }`}
                    >
                      {member.role === "owner" && <ShieldCheck size={12} />}
                      {member.role === "owner" ? "Owner" : "Staff"}
                    </button>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        member.status === "active" ? "bg-olive/10 text-olive" : "bg-terracotta/10 text-terracotta"
                      }`}
                    >
                      {member.status === "active" ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openReset(member)}
                        className="inline-flex items-center gap-1.5 text-charcoal/50 hover:text-olive"
                        aria-label={`Reset password for ${member.name}`}
                      >
                        <KeyRound size={16} />
                      </button>
                      <button
                        onClick={() => handleStatusToggle(member)}
                        disabled={member.uid === user?.uid}
                        className="inline-flex items-center gap-1.5 text-charcoal/50 hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={member.status === "active" ? `Disable ${member.name}` : `Re-enable ${member.name}`}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-charcoal/40" onClick={() => setShowForm(false)} aria-label="Close" />
          <div className="relative w-full max-w-md bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold">Invite Staff</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-charcoal/50 hover:text-charcoal" aria-label="Close form">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Name *</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  autoFocus
                  placeholder="Ama Serwaa"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="ama@example.com"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Password *</label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
                <p className="mt-1 text-xs text-charcoal/50">You set this — share it with them yourself (WhatsApp, in person). They can sign in right away.</p>
              </div>
              <p className="text-xs leading-5 text-charcoal/50">
                They&apos;ll get POS + Orders access only — no products, categories, staff, or settings.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
              >
                {saving ? "Inviting..." : "Invite"}
              </button>
            </form>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button className="absolute inset-0 bg-charcoal/40" onClick={() => setResetTarget(null)} aria-label="Close" />
          <div className="relative w-full max-w-md bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-xl font-semibold">Reset Password</h3>
              <button type="button" onClick={() => setResetTarget(null)} className="text-charcoal/50 hover:text-charcoal" aria-label="Close form">
                <X size={20} />
              </button>
            </div>
            <p className="mb-4 text-sm text-charcoal/60">
              Setting a new password for <span className="font-medium text-charcoal">{resetTarget.name || resetTarget.email}</span>. They&apos;ll be signed out immediately and need the new password to sign back in.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">New password *</label>
                <input
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  required
                  autoFocus
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full rounded-md border border-charcoal/20 p-2.5 outline-none focus:border-olive"
                />
              </div>
              <button
                type="submit"
                disabled={resetting}
                className="w-full rounded-md bg-olive py-3 font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
              >
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
