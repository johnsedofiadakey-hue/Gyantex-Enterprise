"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, XCircle } from "lucide-react";
import { functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useCartStore } from "@/store/useCartStore";
import BrandMark from "@/components/BrandMark";
import OrderStatusCard, { type OrderStatusData } from "@/components/OrderStatusCard";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref");
  const token = searchParams.get("token");
  const clearCart = useCartStore((state) => state.clearCart);

  const [state, setState] = useState<"loading" | "found" | "error">(reference && token ? "loading" : "error");
  const [order, setOrder] = useState<OrderStatusData | null>(null);

  useEffect(() => {
    if (!reference || !token) return;

    const getOrderStatus = httpsCallable(functions, "getOrderStatus");
    getOrderStatus({ orderId: reference, token })
      .then((result) => {
        const data = result.data as OrderStatusData;
        setOrder(data);
        setState("found");
        if (data.status === "paid") clearCart();
      })
      .catch((err) => {
        console.error(err);
        setState("error");
      });
  }, [clearCart, reference, token]);

  return (
    <div className="flex min-h-screen flex-col bg-soft-grey">
      <header className="border-b border-soft-grey bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-charcoal transition-colors hover:text-olive">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to catalog</span>
          </Link>
          <BrandMark compact className="items-center" />
          <div className="w-28" />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {state === "loading" && (
          <div className="w-full max-w-md bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-soft-grey border-t-olive" />
            <h1 className="mb-2 font-serif text-2xl font-semibold">Checking your order...</h1>
            <p className="text-sm text-charcoal/60">This will only take a moment.</p>
          </div>
        )}

        {state === "error" && (
          <div className="w-full max-w-md bg-white p-8 text-center shadow-sm">
            <XCircle className="mx-auto mb-6 text-terracotta" size={48} />
            <h1 className="mb-2 font-serif text-2xl font-semibold">We couldn&apos;t find that order</h1>
            <p className="mb-6 text-sm leading-6 text-charcoal/60">
              If you completed a payment, check your SMS or email confirmation, then track it with your order number.
            </p>
            <div className="grid gap-3">
              <Link href="/track-order" className="rounded-md bg-olive px-8 py-3 text-sm font-semibold text-white hover:bg-olive/90">
                Track order
              </Link>
              <Link href="/" className="rounded-md border border-charcoal/15 px-8 py-3 text-sm font-semibold hover:border-olive hover:text-olive">
                Back to catalog
              </Link>
            </div>
          </div>
        )}

        {state === "found" && order && (
          <div className="flex w-full max-w-md flex-col items-center gap-4">
            <OrderStatusCard order={order} />
            <Link href="/" className="rounded-md bg-olive px-8 py-3 text-sm font-semibold text-white hover:bg-olive/90">
              Continue browsing
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={null}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
