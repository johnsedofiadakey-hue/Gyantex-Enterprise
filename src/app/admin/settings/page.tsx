"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { RotateCcw } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  applyBrandColors,
  applyBrandFont,
  BRAND_COLOR_FIELDS,
  BRAND_FONT_OPTIONS,
  DEFAULT_BRAND_COLORS,
  DEFAULT_BRAND_FONT,
  type BrandColors,
} from "@/lib/branding";
import { useToastStore } from "@/store/useToastStore";
import {
  BUSINESS_HOURS,
  BUSINESS_PHONE_DISPLAY,
  FACEBOOK_PAGE,
  INSTAGRAM_HANDLE,
  PICKUP_ADDRESS,
  SUPPORT_EMAIL,
  WHATSAPP_NUMBER,
} from "@/lib/config";

function authErrorMessage(error: unknown, fallback: string): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Current password is incorrect.";
    case "auth/email-already-in-use":
      return "That email is already in use by another account.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return fallback;
  }
}

function ChangeEmailForm({ user }: { user: User }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToastStore((state) => state.show);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email) return;
    setSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await verifyBeforeUpdateEmail(user, newEmail);
      toast(`Verification link sent to ${newEmail}. Your sign-in email changes once you confirm it.`, "success");
      setCurrentPassword("");
      setNewEmail("");
    } catch (error) {
      toast(authErrorMessage(error, "Couldn't update email. Please try again."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="text-sm font-medium">Change Email</h4>
      <input
        type="email"
        required
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        placeholder="New email address"
        className="w-full rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
      />
      <input
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
        className="w-full rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-charcoal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-charcoal/85 disabled:opacity-70"
      >
        {submitting ? "Sending..." : "Send verification link"}
      </button>
    </form>
  );
}

function ChangePasswordForm({ user }: { user: User }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const toast = useToastStore((state) => state.show);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.email) return;
    if (newPassword !== confirmPassword) {
      toast("New passwords don't match.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      toast("Password updated.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast(authErrorMessage(error, "Couldn't update password. Please try again."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="text-sm font-medium">Change Password</h4>
      <input
        type="password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Current password"
        className="w-full rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
      />
      <input
        type="password"
        required
        minLength={6}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        className="w-full rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
      />
      <input
        type="password"
        required
        minLength={6}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm new password"
        className="w-full rounded-md border border-charcoal/20 p-2.5 text-sm outline-none focus:border-olive"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-charcoal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-charcoal/85 disabled:opacity-70"
      >
        {submitting ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

function BrandingSection() {
  const [colors, setColors] = useState<BrandColors>(DEFAULT_BRAND_COLORS);
  const [font, setFont] = useState<string>(DEFAULT_BRAND_FONT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToastStore((state) => state.show);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, "settings", "branding"));
        if (snap.exists()) {
          const data = snap.data() as Partial<BrandColors> & { font?: string };
          setColors({ ...DEFAULT_BRAND_COLORS, ...data });
          setFont(data.font ?? DEFAULT_BRAND_FONT);
        }
      } catch (error) {
        console.error("Failed to load branding", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "branding"), { ...colors, font });
      applyBrandColors(colors);
      applyBrandFont(font);
      toast("Branding updated — live on the site now.", "success");
    } catch (error) {
      console.error(error);
      toast("Couldn't save branding. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setColors(DEFAULT_BRAND_COLORS);
    setFont(DEFAULT_BRAND_FONT);
  };

  return (
    <section className="bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Branding</h3>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-medium text-charcoal/50 hover:text-olive"
        >
          <RotateCcw size={13} /> Reset to defaults
        </button>
      </div>
      <p className="mb-5 text-sm leading-6 text-charcoal/60">
        Changes apply across the whole site — the storefront, cart, and admin panel — the moment you save.
      </p>

      {loading ? (
        <p className="text-sm text-charcoal/50">Loading...</p>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {BRAND_COLOR_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colors[field.key]) ? colors[field.key] : field.default}
                  onChange={(event) => setColors({ ...colors, [field.key]: event.target.value })}
                  className="h-11 w-11 shrink-0 cursor-pointer rounded border border-charcoal/20 p-0.5"
                  aria-label={`${field.label} color`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{field.label}</div>
                  <div className="text-xs text-charcoal/50">{field.hint}</div>
                </div>
                <input
                  value={colors[field.key]}
                  onChange={(event) => setColors({ ...colors, [field.key]: event.target.value })}
                  placeholder={field.default}
                  className="w-28 rounded-md border border-charcoal/20 p-2 text-sm outline-none focus:border-olive"
                />
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Font Pairing</div>
            <div className="space-y-2">
              {BRAND_FONT_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors ${
                    font === option.id ? "border-olive bg-olive/5" : "border-charcoal/15 hover:border-charcoal/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="brand-font"
                    checked={font === option.id}
                    onChange={() => setFont(option.id)}
                    className="mt-1 accent-olive"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium" style={{ fontFamily: `${option.sansVar}, sans-serif` }}>
                      {option.label}
                    </div>
                    <div className="text-xs text-charcoal/50">{option.description}</div>
                    <div className="mt-1 text-base" style={{ fontFamily: `${option.serifVar}, serif` }}>
                      Gyantex Enterprise
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-md bg-olive py-2.5 text-sm font-semibold text-white transition-colors hover:bg-olive/90 disabled:opacity-70"
          >
            {saving ? "Saving..." : "Save Branding"}
          </button>
        </div>
      )}
    </section>
  );
}

export default function AdminSettingsPage() {
  const { role, user } = useAdminRole();

  if (role === "staff") {
    return (
      <div className="bg-white p-12 text-center text-charcoal/50 shadow-sm">
        This page is only available to the business owner.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Your Account</h3>
        <div className="space-y-1 text-sm text-charcoal/70">
          <p><span className="text-charcoal/50">Signed in as</span> {user?.email}</p>
        </div>
        <p className="mt-4 text-xs leading-5 text-charcoal/50">
          To give another team member access, use <span className="font-medium text-charcoal">Admin → Staff</span> to invite them — no scripts needed.
        </p>

        {user && (
          <div className="mt-6 grid gap-6 border-t border-charcoal/10 pt-6 sm:grid-cols-2">
            <ChangeEmailForm user={user} />
            <ChangePasswordForm user={user} />
          </div>
        )}
      </section>

      <section className="bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Business Contact</h3>
        <div className="space-y-2 text-sm text-charcoal/70">
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">WhatsApp</span>
            <span className="font-medium">{BUSINESS_PHONE_DISPLAY} (+{WHATSAPP_NUMBER})</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Email</span>
            <span className="font-medium">{SUPPORT_EMAIL}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Address</span>
            <span className="text-right font-medium">{PICKUP_ADDRESS}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Hours</span>
            <span className="font-medium">{BUSINESS_HOURS}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-charcoal/50">Social</span>
            <span className="text-right font-medium">{INSTAGRAM_HANDLE} / {FACEBOOK_PAGE}</span>
          </div>
        </div>
      </section>

      <section className="bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Pickup and Delivery</h3>
        <p className="text-sm leading-6 text-charcoal/60">
          Delivery zones, pricing, and free-delivery options now live in <span className="font-medium text-charcoal">Admin → Delivery</span> — add, edit, or hide options there and checkout picks it up immediately.
        </p>
      </section>

      <BrandingSection />
    </div>
  );
}
