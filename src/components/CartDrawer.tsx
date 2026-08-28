"use client";

import Link from "next/link";
import { X, ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCartStore } from "@/store/useCartStore";
import ProductImage from "@/components/ProductImage";

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const cart = useCartStore();
  const hasQuoteItems = cart.items.some((item) => item.priceMode === "quote" || item.price <= 0);
  const fixedSubtotal = cart.totalPrice();

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-charcoal/40"
            onClick={() => onOpenChange(false)}
            aria-label="Close cart"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-soft-grey px-5 py-4">
              <div className="flex items-center gap-2 font-semibold">
                <ShoppingBag size={18} />
                Your Cart{cart.items.length > 0 ? ` · ${cart.totalItems()} item${cart.totalItems() === 1 ? "" : "s"}` : ""}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-charcoal/60 hover:bg-soft-grey hover:text-charcoal"
                aria-label="Close cart"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {cart.items.length === 0 ? (
                <div className="py-16 text-center text-sm text-charcoal/60">No items added yet.</div>
              ) : (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3 border-b border-soft-grey pb-4 last:border-0">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-soft-grey">
                        <ProductImage src={item.image} alt={item.name} sizes="80px" className="object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium leading-tight">{item.name}</div>
                          <button
                            onClick={() => cart.removeItem(item.id)}
                            className="-mr-2 -mt-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-charcoal/40 transition hover:bg-soft-grey hover:text-terracotta"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                        <div className="mt-1 text-xs text-charcoal/55">
                          {item.priceMode === "quote" || item.price <= 0
                            ? item.minimumOrder || "Custom quote"
                            : `${item.color} | ${item.purchaseType === "half" ? "Half" : "Full"}`}
                        </div>
                        {item.selections && Object.keys(item.selections).length > 0 && (
                          <div className="mt-0.5 text-xs text-charcoal/55">
                            {Object.entries(item.selections).map(([label, value]) => `${label}: ${value}`).join(" · ")}
                          </div>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <div className="flex items-center rounded-md border border-charcoal/15">
                            <button
                              onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                              className="grid h-9 w-9 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                            <button
                              onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                              className="grid h-9 w-9 place-items-center text-charcoal/60 transition hover:bg-soft-grey hover:text-charcoal"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                          <div className="text-sm font-semibold">
                            {item.priceMode === "quote" || item.price <= 0
                              ? "Price not set yet"
                              : `GHS ${(item.price * item.quantity).toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-soft-grey p-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-charcoal/60">Subtotal</span>
                <span className="font-semibold">
                  {hasQuoteItems && fixedSubtotal === 0 ? "Price not set yet" : `GHS ${fixedSubtotal.toFixed(2)}`}
                </span>
              </div>
              <div className="grid gap-3">
                <Link
                  href="/checkout"
                  onClick={() => onOpenChange(false)}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-olive px-4 text-sm font-semibold text-white hover:bg-olive/90"
                >
                  <ShoppingBag size={16} />
                  Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={() => onOpenChange(false)}
                  className="flex min-h-[44px] items-center justify-center rounded-md border border-charcoal/20 px-4 text-center text-sm font-semibold hover:bg-soft-grey"
                >
                  Review cart
                </Link>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
