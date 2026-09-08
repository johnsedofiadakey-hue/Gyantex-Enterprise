"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search } from "lucide-react";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import OrderStatusCard, { type OrderStatusData } from "@/components/OrderStatusCard";
import Footer from "@/components/Footer";
import { getCallableErrorMessage } from "@/lib/errors";
import BrandMark from "@/components/BrandMark";

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const linkOrderId = searchParams.get("orderId");
  const linkToken = searchParams.get("token");
  const hasTrackingLink = Boolean(linkOrderId && linkToken);

  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "found" | "error">(hasTrackingLink ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [order, setOrder] = useState<OrderStatusData | null>(null);

  useEffect(() => {
    if (!hasTrackingLink) return;
    const getOrderStatus = httpsCallable(functions, "getOrderStatus");
    getOrderStatus({ orderId: linkOrderId, token: linkToken })
      .then((result) => {
        setOrder(result.data as OrderStatusData);
        setState("found");
      })
      .catch((error: unknown) => {
        console.error(error);
        setErrorMessage(getCallableErrorMessage(error, "This tracking link is no longer valid. Look up your order below instead."));
        setState("error");
      });
  }, [hasTrackingLink, linkOrderId, linkToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMessage("");
    try {
      const trackOrder = httpsCallable(functions, "trackOrder");
      const result = await trackOrder({ orderNumber: orderNumber.trim(), phone: phone.trim() });
      setOrder(result.data as OrderStatusData);
      setState("found");
    } catch (error: unknown) {
      console.error(error);
      setErrorMessage(getCallableErrorMessage(error, "We couldn't look up your order right now. Please try again or message us on WhatsApp."));
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-soft-grey flex flex-col">
      <header className="bg-white border-b border-soft-grey px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-charcoal hover:text-olive transition-colors">
            <ArrowLeft size={20} />
            <span className="font-medium text-sm">Back to catalog</span>
          </Link>
          <BrandMark compact className="items-center" />
          <div className="w-28" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md flex flex-col items-center gap-6">
          {state === "loading" && (
            <div className="w-full rounded-2xl bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-soft-grey border-t-olive" />
              <p className="text-sm text-charcoal/60">Looking up your order...</p>
            </div>
          )}

          {(state === "idle" || state === "error") && (
            <div className="w-full rounded-2xl bg-white p-8 shadow-sm">
              <h1 className="font-serif text-2xl font-semibold mb-2 text-center">Track Your Order</h1>
              <p className="text-charcoal/60 text-sm mb-6 text-center">
                Enter the order number and the phone number used to place it.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Order number</label>
                  <input
                    required
                    autoFocus
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="e.g. GYX-1042"
                    className="w-full p-3 rounded-lg border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone number used at checkout</label>
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="024 686 0173"
                    className="w-full p-3 rounded-lg border border-charcoal/20 focus:border-olive focus:ring-1 focus:ring-olive outline-none"
                  />
                </div>

                {state === "error" && <p className="text-sm text-terracotta">{errorMessage}</p>}

                <button
                  type="submit"
                  className="w-full bg-olive text-white py-3 rounded-xl font-semibold hover:bg-olive/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Search size={16} /> Track Order
                </button>
              </form>

              <p className="text-xs text-charcoal/50 text-center mt-6">
                Can&apos;t find your order number? Message Gyantex on WhatsApp with your name instead.
              </p>
            </div>
          )}

          {state === "found" && order && (
            <>
              <OrderStatusCard order={order} />
              <button
                onClick={() => { setState("idle"); setOrder(null); }}
                className="text-sm text-olive font-medium hover:underline"
              >
                Track a different order
              </button>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <TrackOrderContent />
    </Suspense>
  );
}
