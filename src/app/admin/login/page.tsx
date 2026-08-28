"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ArrowLeft, Lock } from "lucide-react";
import BrandMark from "@/components/BrandMark";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const tokenResult = await credential.user.getIdTokenResult();
      const role = tokenResult.claims.role;
      const hasAccess = role === "owner" || role === "staff" || tokenResult.claims.admin === true;
      if (!hasAccess) {
        setError("This account doesn't have admin access.");
        setIsSubmitting(false);
        return;
      }
      router.push("/admin");
    } catch {
      setError("Incorrect email or password.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} /> Back to site
        </Link>

        <div className="text-center mb-8">
          <BrandMark tone="dark" admin href="/" className="items-center" />
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none"
              placeholder="admin@gyantexenterprise.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-md border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-terracotta">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-olive text-white py-3 rounded-md font-semibold hover:bg-olive/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            <Lock size={16} /> {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
