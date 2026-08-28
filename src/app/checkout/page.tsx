"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { AlertCircle, ArrowLeft, Lock, MapPin, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
  PAYMENT_METHODS,
  PICKUP_ADDRESS,
} from "@/lib/config";
import { DEFAULT_DELIVERY_ZONES, type DeliveryZone } from "@/lib/catalog";
import { getCallableErrorMessage } from "@/lib/errors";
import { db, functions } from "@/lib/firebase";
import { trackEvent } from "@/lib/analytics";
import { useCartHydrated, useCartStore, type CartItem } from "@/store/useCartStore";
import { useToastStore } from "@/store/useToastStore";
import BrandMark from "@/components/BrandMark";
import KenteStripe from "@/components/KenteStripe";
import ProductImage from "@/components/ProductImage";

interface CheckoutResponse {
  authorization_url?: string;
  orderId?: string;
  totalAmount?: number;
}

interface CheckoutFormValues {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  marketingOptIn: boolean;
}

function isQuoteItem(item: CartItem) {
  return item.priceMode === "quote" || item.price <= 0;
}

function itemPriceLabel(item: CartItem) {
  if (isQuoteItem(item)) return "Price not set yet";
  return `GHS ${(item.price * item.quantity).toFixed(2)}`;
}

function readForm(form: HTMLFormElement): CheckoutFormValues {
  const data = new FormData(form);
  return {
    fullName: String(data.get("fullName") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    email: String(data.get("email") || "").trim(),
    address: String(data.get("address") || "").trim(),
    notes: String(data.get("notes") || "").trim(),
    marketingOptIn: data.get("marketingOptIn") === "on",
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartStore();
  const toast = useToastStore((state) => state.show);
  const hydrated = useCartHydrated();

  const [zones, setZones] = useState<DeliveryZone[]>(DEFAULT_DELIVERY_ZONES);
  const [deliveryZone, setDeliveryZone] = useState<string>("pickup");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (hydrated && cart.items.length === 0) {
      router.push("/cart");
    }
  }, [cart.items.length, hydrated, router]);

  useEffect(() => {
    async function fetchZones() {
      try {
        const snap = await getDocs(query(collection(db, "deliveryZones"), orderBy("order", "asc")));
        const live = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DeliveryZone)).filter((z) => z.active !== false);
        if (live.length > 0) setZones(live);
      } catch (error) {
        console.error("Failed to load delivery options", error);
      }
    }
    fetchZones();
  }, []);

  const hasQuoteItems = useMemo(() => cart.items.some(isQuoteItem), [cart.items]);
  const selectedDelivery = zones.find((option) => option.id === deliveryZone) || zones[0];
  const subtotal = cart.totalPrice();
  const deliveryFee = hasQuoteItems ? 0 : selectedDelivery.fee;
  const total = subtotal + deliveryFee;

  if (!hydrated || cart.items.length === 0) return null;

  const validateForm = (values: CheckoutFormValues) => {
    if (!values.fullName || !values.phone) {
      toast("Enter your name and phone number first.", "error");
      return false;
    }
    if (deliveryZone !== "pickup" && !values.address) {
      toast("Add a delivery address or choose pickup at Kejetia.", "error");
      return false;
    }
    return true;
  };

  const buildOrderPayload = (values: CheckoutFormValues) => ({
    customer: {
      firstName: values.fullName,
      phone: values.phone,
      email: values.email,
      marketingOptIn: values.marketingOptIn,
    },
    items: cart.items,
    deliveryZone,
    deliveryDetails: {
      zone: deliveryZone,
      label: selectedDelivery.label,
      address: values.address,
      notes: values.notes,
      pickupAddress: deliveryZone === "pickup" ? PICKUP_ADDRESS : "",
    },
  });

  const handlePaystackCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = readForm(event.currentTarget);
    if (!validateForm(values)) return;
    if (hasQuoteItems) {
      toast("One or more items in your cart don't have a price set yet.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      const initializeCheckoutFn = httpsCallable(functions, "initializeCheckout");
      const result: HttpsCallableResult<unknown> = await initializeCheckoutFn({
        ...buildOrderPayload(values),
        origin: window.location.origin,
      });

      const data = result.data as CheckoutResponse;
      if (data?.authorization_url) {
        trackEvent("paystack_checkout_start", { totalAmount: data.totalAmount, orderId: data.orderId });
        window.location.assign(data.authorization_url);
      } else {
        toast("Payment initialization failed. Please try again.", "error");
        setIsProcessing(false);
      }
    } catch (error: unknown) {
      console.error(error);
      toast(getCallableErrorMessage(error, "We couldn't process checkout. Please try again."), "error");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F1]">
      <header className="border-b border-soft-grey bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/cart" className="flex items-center gap-2 text-charcoal transition-colors hover:text-olive">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to cart</span>
          </Link>
          <BrandMark compact className="items-center" />
          <div className="flex items-center gap-2 text-sm font-medium text-olive">
            <Lock size={16} />
            <span className="hidden sm:inline">Secure</span>
          </div>
        </div>
      </header>
      <KenteStripe />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl font-semibold md:text-4xl">Almost there</h1>
          <p className="mt-1.5 text-sm leading-6 text-charcoal/60">Just your details and a delivery choice — no account needed.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
          <form id="checkout-form" onSubmit={handlePaystackCheckout} className="space-y-5">
            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-1 flex items-center gap-2.5 font-serif text-xl font-semibold">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-olive/12 text-olive">
                  <UserRound size={16} />
                </span>
                Your Details
              </h2>
              <p className="mb-5 text-sm leading-6 text-charcoal/55">
                No account needed. We only use this to confirm your order and keep you updated.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Full name *</label>
                  <input name="fullName" required autoComplete="name" className="w-full rounded-lg border border-charcoal/20 p-3 outline-none focus:border-olive focus:ring-1 focus:ring-olive" placeholder="Kwadwo Effah" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Phone / WhatsApp *</label>
                  <input name="phone" required type="tel" autoComplete="tel" className="w-full rounded-lg border border-charcoal/20 p-3 outline-none focus:border-olive focus:ring-1 focus:ring-olive" placeholder="024 686 0173" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Email <span className="font-normal text-charcoal/45">(optional)</span></label>
                  <input name="email" type="email" autoComplete="email" className="w-full rounded-lg border border-charcoal/20 p-3 outline-none focus:border-olive focus:ring-1 focus:ring-olive" placeholder="you@example.com" />
                </div>
              </div>
              <label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg bg-olive/10 px-4 py-3">
                <input type="checkbox" name="marketingOptIn" className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-olive" />
                <span className="text-sm leading-5 text-olive">Send me new designs and offers on WhatsApp or SMS</span>
              </label>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
              <h2 className="mb-5 flex items-center gap-2.5 font-serif text-xl font-semibold">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-teal/12 text-teal">
                  <MapPin size={16} />
                </span>
                Pickup or delivery
              </h2>
              <div className="space-y-3">
                {zones.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4 transition ${
                      deliveryZone === option.id ? "border-olive bg-olive/5" : "border-charcoal/15 hover:border-olive/50"
                    }`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="deliveryZone"
                        checked={deliveryZone === option.id}
                        onChange={() => setDeliveryZone(option.id)}
                        className="mt-1 h-4 w-4 accent-olive"
                      />
                      <span>
                        <span className="block font-medium">{option.label}</span>
                        <span className="mt-1 block text-sm leading-5 text-charcoal/55">{option.description}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">
                      {hasQuoteItems ? "—" : option.fee === 0 ? "Free" : `GHS ${option.fee.toFixed(2)}`}
                    </span>
                  </label>
                ))}
              </div>

              {deliveryZone !== "pickup" && (
                <div className="mt-5 grid gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Address / landmark *</label>
                    <input name="address" required className="w-full rounded-lg border border-charcoal/20 p-3 outline-none focus:border-olive focus:ring-1 focus:ring-olive" placeholder="Town, street, landmark, contact person..." />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Delivery notes</label>
                    <textarea name="notes" className="h-24 w-full resize-none rounded-lg border border-charcoal/20 p-3 outline-none focus:border-olive focus:ring-1 focus:ring-olive" placeholder="Any timing or delivery instructions." />
                  </div>
                </div>
              )}
            </section>
          </form>

          <aside className="h-fit rounded-2xl bg-white p-5 shadow-sm lg:sticky lg:top-6 md:p-6">
          <h2 className="mb-5 font-serif text-2xl font-semibold">Request summary</h2>
          <div className="mb-5 max-h-72 space-y-4 overflow-y-auto pr-1">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-soft-grey pb-4 last:border-0">
                <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-soft-grey">
                  <ProductImage src={item.image} alt={item.name} sizes="64px" className="object-cover" />
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-charcoal px-1 text-[11px] font-semibold text-white">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium leading-tight">{item.name}</div>
                  <div className="mt-1 text-xs text-charcoal/50">{item.category}</div>
                  <div className="mt-1 text-xs text-charcoal/60">
                    {[item.color, ...(item.selections ? Object.entries(item.selections).map(([label, value]) => `${label}: ${value}`) : [])]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  <div className="mt-2 font-semibold">{itemPriceLabel(item)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-soft-grey pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-charcoal/60">Subtotal</span>
              <span className="font-semibold">
                {hasQuoteItems && subtotal === 0 ? "Price not set yet" : `GHS ${subtotal.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-charcoal/60">Delivery</span>
              <span className="text-right font-medium">
                {hasQuoteItems ? "—" : deliveryFee === 0 ? "Free" : `GHS ${deliveryFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-t border-soft-grey pt-3">
              <span className="font-semibold">Total to pay</span>
              <span className="text-lg font-bold">GHS {total.toFixed(2)}</span>
            </div>
          </div>

          {hasQuoteItems ? (
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-terracotta/10 p-4 text-sm leading-5 text-terracotta">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>One or more items in your cart don&apos;t have a price set yet, so this can&apos;t be paid for online yet.</span>
            </div>
          ) : (
            <div className="mt-6">
              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-olive px-5 py-4 text-sm font-semibold text-white transition hover:bg-olive/90 disabled:opacity-70"
              >
                <Lock size={17} />
                {isProcessing ? "Initializing Paystack..." : `Pay GHS ${total.toFixed(2)}`}
              </button>
            </div>
          )}

          <div className="mt-5 rounded-lg bg-[#FBF8F1] p-4 text-xs leading-5 text-charcoal/60">
            Online payment supports {PAYMENT_METHODS.join(", ")} via Paystack.
          </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
