"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { PLACEHOLDER_IMAGE } from "@/lib/config";
import { useCartHydrated, useCartStore, type CartItem } from "@/store/useCartStore";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";
import KenteStripe from "@/components/KenteStripe";
import ProductImage from "@/components/ProductImage";

function isQuoteItem(item: CartItem) {
  return item.priceMode === "quote" || item.price <= 0;
}

function itemPriceLabel(item: CartItem) {
  if (isQuoteItem(item)) return "Price not set yet";
  return `GHS ${(item.price * item.quantity).toFixed(2)}`;
}

export default function CartPage() {
  const hydrated = useCartHydrated();
  const cart = useCartStore();

  if (!hydrated) return null;

  const hasQuoteItems = cart.items.some(isQuoteItem);
  const fixedSubtotal = cart.totalPrice();

  return (
    <div className="flex min-h-screen flex-col bg-[#FBF8F1]">
      <header className="border-b border-soft-grey bg-white px-4 py-3 md:px-6 md:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-charcoal transition-colors hover:text-olive">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Continue browsing</span>
          </Link>
          <BrandMark compact className="items-center" />
          <div className="w-28" />
        </div>
      </header>
      <KenteStripe />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-olive">Cart review</p>
            <h1 className="font-serif text-3xl font-semibold md:text-5xl">Your cart</h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-charcoal/60">
            Review your items, then continue to checkout for pricing, design direction, and timeline.
          </p>
        </div>

        {cart.items.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm md:p-14">
            <h2 className="mb-3 font-serif text-2xl font-semibold">Your cart is empty</h2>
            <p className="mx-auto mb-6 max-w-sm text-sm leading-6 text-charcoal/60">
              Choose a funeral, church, school, institutional, souvenir, or catalog path to start your order.
            </p>
            <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-olive px-8 py-3 text-sm font-semibold text-white hover:bg-olive/90">
              View catalog
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <section className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[96px_1fr] gap-4 border-b border-soft-grey pb-4 last:border-0 last:pb-0 md:grid-cols-[112px_1fr]">
                    <div className="relative h-32 overflow-hidden rounded-md bg-soft-grey md:h-36">
                      <ProductImage src={item.image || PLACEHOLDER_IMAGE} alt={item.name} sizes="112px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/product/${item.productId}`} className="font-semibold leading-tight hover:text-olive">
                            {item.name}
                          </Link>
                          <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-olive">{item.category || "Custom textile"}</p>
                        </div>
                        <button
                          onClick={() => cart.removeItem(item.id)}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-charcoal/40 transition hover:bg-soft-grey hover:text-terracotta"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-charcoal/60">
                        {isQuoteItem(item)
                          ? item.minimumOrder || "Final pricing depends on quantity, fabric, artwork, and deadline."
                          : `${item.color} | ${item.purchaseType === "half" ? "Half" : "Full"}`}
                      </p>
                      {item.selections && Object.keys(item.selections).length > 0 && (
                        <p className="mt-1 text-xs text-charcoal/55">
                          {Object.entries(item.selections).map(([label, value]) => `${label}: ${value}`).join(" · ")}
                        </p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center rounded-md border border-charcoal/15">
                          <button
                            onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                            className="grid h-11 w-11 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                            className="grid h-11 w-11 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right text-sm font-semibold">{itemPriceLabel(item)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <h2 className="mb-5 font-serif text-2xl font-semibold">Next step</h2>
              <div className="space-y-3 border-b border-soft-grey pb-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/60">Subtotal</span>
                  <span className="font-semibold">
                    {hasQuoteItems && fixedSubtotal === 0 ? "Price not set yet" : `GHS ${fixedSubtotal.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-charcoal/60">Delivery</span>
                  <span className="text-right text-charcoal/60">Chosen at checkout</span>
                </div>
              </div>
              <p className="my-5 text-sm leading-6 text-charcoal/62">
                Just your name, phone, and a delivery choice — takes under a minute.
              </p>
              <Link
                href="/checkout"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-olive px-5 py-4 text-sm font-semibold text-white transition hover:bg-olive/90"
              >
                <ShoppingBag size={18} />
                Continue to Checkout
              </Link>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
